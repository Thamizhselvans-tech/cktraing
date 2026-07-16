const Student = require('../models/Student.model');
const Department = require('../models/Department.model');
const UploadedFile = require('../models/UploadedFile.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const StudentFeedback = require('../models/StudentFeedback.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, STATUS, ROLES } = require('../config/constants');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');

// GET all students
exports.getAllStudents = catchAsync(async (req, res) => {
  const { search, department, status: statusFilter, year, page, limit } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (statusFilter && statusFilter !== 'all') {
    filter.status = statusFilter;
  } else if (!statusFilter) {
    filter.status = STATUS.ACTIVE;
  }
  if (department) filter.department = department;
  if (year) filter.year = Number(year);
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { registerNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(l)
      .select('-password'),
    Student.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Students fetched', students, p, l, total);
});

// GET student by ID
exports.getStudent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  // Students can only view their own data
  if (role === ROLES.STUDENT && userId.toString() !== id.toString()) {
    return sendError(res, 403, 'You can only view your own profile.');
  }

  const student = await Student.findById(id)
    .populate('department', 'name code')
    .select('-password');
  if (!student) return sendError(res, 404, 'Student not found.');

  return sendSuccess(res, 200, 'Student fetched', student);
});

// GET students by department
exports.getStudentsByDepartment = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const [students, total] = await Promise.all([
    Student.find({ department: deptId, status: STATUS.ACTIVE })
      .populate('department', 'name code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(l)
      .select('-password'),
    Student.countDocuments({ department: deptId, status: STATUS.ACTIVE }),
  ]);

  return sendPaginated(res, 'Students fetched', students, p, l, total);
});

// POST create student
exports.createStudent = catchAsync(async (req, res) => {
  const { registerNumber, name, email, department, year, batch, phone } = req.body;

  if (!registerNumber || !name || !department) {
    return sendError(res, 400, 'Register number, name, and department are required.');
  }

  const existing = await Student.findOne({ registerNumber });
  if (existing) {
    return sendError(res, 409, `Student with register number '${registerNumber}' already exists.`);
  }

  const dept = await Department.findById(department);
  if (!dept || dept.status === STATUS.INACTIVE) {
    return sendError(res, 404, 'Department not found or inactive.');
  }

  const student = await Student.create({
    registerNumber,
    name,
    email,
    password: dept.code.toUpperCase() + registerNumber.trim().toUpperCase(), // Default password = Department Code + Register Number
    mustChangePassword: true,
    department,
    year,
    batch,
    phone,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created student '${name}' (${registerNumber})`,
  });

  const result = await Student.findById(student._id)
    .populate('department', 'name code')
    .select('-password');
  return sendSuccess(res, 201, 'Student created successfully', result);
});

// PUT update student
exports.updateStudent = catchAsync(async (req, res) => {
  const { name, email, department, year, batch, phone, status } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return sendError(res, 404, 'Student not found.');

  const previousData = student.toObject();

  if (name) student.name = name;
  if (email !== undefined) student.email = email;
  if (department) student.department = department;
  if (year !== undefined) student.year = year;
  if (batch !== undefined) student.batch = batch;
  if (phone !== undefined) student.phone = phone;
  if (status) student.status = status;

  await student.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    newData: student.toObject(),
    description: `Updated student '${student.name}' (${student.registerNumber})`,
  });

  const result = await Student.findById(student._id)
    .populate('department', 'name code')
    .select('-password');
  return sendSuccess(res, 200, 'Student updated successfully', result);
});

// DELETE (soft delete) student
exports.deleteStudent = catchAsync(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return sendError(res, 404, 'Student not found.');

  student.status = STATUS.INACTIVE;
  await student.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Soft-deleted student '${student.name}' (${student.registerNumber})`,
  });

  return sendSuccess(res, 200, 'Student deactivated successfully.');
});

// POST upload students via Excel
exports.uploadStudentsExcel = catchAsync(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Please upload an Excel file.');

  // Parse Excel
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rows.length === 0) {
    return sendError(res, 400, 'Excel file is empty or has no data rows.');
  }

  // Normalize row keys to handle header case and spacing variation
  const normalizedRows = rows.map((row) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_-]/g, '');
      if (cleanKey === 'registernumber' || cleanKey === 'regno' || cleanKey === 'regnumber' || cleanKey === 'registerno') {
        normalized.registerNumber = row[key];
      } else if (cleanKey === 'name' || cleanKey === 'studentname' || cleanKey === 'fullname') {
        normalized.name = row[key];
      } else if (cleanKey === 'department' || cleanKey === 'dept' || cleanKey === 'departmentname') {
        normalized.department = row[key];
      } else if (cleanKey === 'email' || cleanKey === 'emailaddress') {
        normalized.email = row[key];
      } else if (cleanKey === 'year') {
        normalized.year = row[key];
      } else if (cleanKey === 'batch') {
        normalized.batch = row[key];
      } else if (cleanKey === 'phone' || cleanKey === 'phonenumber' || cleanKey === 'mobile' || cleanKey === 'mobilenumber') {
        normalized.phone = row[key];
      } else {
        normalized[key] = row[key];
      }
    });
    return normalized;
  });

  // Required columns validation
  const requiredCols = ['registerNumber', 'name', 'department'];
  const headers = Object.keys(normalizedRows[0]);
  const missingCols = requiredCols.filter((col) => !headers.includes(col));
  if (missingCols.length > 0) {
    return sendError(
      res,
      400,
      `Missing required columns: ${missingCols.join(', ')}. Required: registerNumber, name, department`
    );
  }

  // Cache departments by name/code for quick lookup
  const departments = await Department.find({ status: STATUS.ACTIVE });
  const deptMap = {};
  const deptCodeMap = {};
  departments.forEach((d) => {
    deptMap[d.name.toLowerCase()] = d._id;
    deptMap[d.code.toLowerCase()] = d._id;
    deptCodeMap[d._id.toString()] = d.code.toUpperCase();
  });

  const results = {
    total: normalizedRows.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  const studentsToInsert = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)

    const regNo = String(row.registerNumber || '').trim();
    const name = String(row.name || '').trim();
    const deptInput = String(row.department || '').trim();
    const deptInputLower = deptInput.toLowerCase();

    // Validate required fields
    if (!regNo || !name || !deptInput) {
      results.failed++;
      results.errors.push({ row: rowNum, registerNumber: regNo, reason: 'Missing required fields (registerNumber, name, department)' });
      continue;
    }

    // Resolve or Auto-create department
    let deptId = deptMap[deptInputLower];
    if (!deptId) {
      try {
        const newDeptCode = deptInput.replace(/[\s_-]/g, '').toUpperCase().substring(0, 10);
        let existingDept = await Department.findOne({ code: newDeptCode });
        if (!existingDept) {
          existingDept = await Department.create({
            name: deptInput,
            code: newDeptCode,
            description: `Automatically created during student excel import`,
            status: STATUS.ACTIVE,
          });

          await createAuditLog({
            action: AUDIT_ACTIONS.CREATE,
            entity: AUDIT_ENTITIES.DEPARTMENT,
            entityId: existingDept._id,
            performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
            ipAddress: req.ip,
            description: `Automatically created department '${existingDept.name}' during Excel upload`,
          });
        }
        deptId = existingDept._id;
        deptMap[deptInputLower] = deptId;
        deptMap[newDeptCode.toLowerCase()] = deptId;
        deptCodeMap[deptId.toString()] = newDeptCode;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, registerNumber: regNo, reason: `Failed to auto-create department '${deptInput}': ${err.message}` });
        continue;
      }
    }

    // Check for duplicates within upload
    if (studentsToInsert.some((s) => s.registerNumber === regNo)) {
      results.skipped++;
      results.errors.push({ row: rowNum, registerNumber: regNo, reason: 'Duplicate register number within upload file' });
      continue;
    }

    const parseYear = (val) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 4) {
        return num;
      }
      const str = String(val).toLowerCase().trim();
      if (str.includes('first') || str.includes('one') || str === 'i' || str === '1st') return 1;
      if (str.includes('second') || str.includes('two') || str === 'ii' || str === '2nd') return 2;
      if (str.includes('third') || str.includes('three') || str === 'iii' || str === '3rd') return 3;
      if (str.includes('fourth') || str.includes('four') || str === 'iv' || str === '4th') return 4;
      return undefined;
    };

    // Check existing in DB
    const existingStudent = await Student.findOne({ registerNumber: regNo });
    if (existingStudent) {
      existingStudent.name = name;
      if (row.email) existingStudent.email = String(row.email).trim();
      existingStudent.department = deptId;
      existingStudent.year = parseYear(row.year);
      if (row.batch) existingStudent.batch = String(row.batch).trim();
      if (row.phone) existingStudent.phone = String(row.phone).trim();

      // If student hasn't changed their password yet, reset it to Department Code + Register Number
      if (existingStudent.mustChangePassword) {
        const regNoUpper = regNo.toUpperCase();
        const match = regNoUpper.match(/\d+([A-Z]+)\d+/);
        const deptCode = match ? match[1] : (deptCodeMap[deptId.toString()] || 'CSE');
        existingStudent.password = deptCode.toUpperCase() + regNoUpper; // Handled by pre-save hook
      }

      await existingStudent.save();

      results.success++;
      continue;
    }

    const regNoUpper = regNo.toUpperCase();
    const match = regNoUpper.match(/\d+([A-Z]+)\d+/);
    const deptCode = match ? match[1] : (deptCodeMap[deptId.toString()] || 'CSE');
    const defaultPassword = deptCode.toUpperCase() + regNoUpper;
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    studentsToInsert.push({
      registerNumber: regNo,
      name,
      email: String(row.email || '').trim() || undefined,
      password: hashedPassword,
      mustChangePassword: true,
      department: deptId,
      year: parseYear(row.year),
      batch: String(row.batch || '').trim() || undefined,
      phone: String(row.phone || '').trim() || undefined,
    });
  }

  // Bulk insert valid students
  let bulkSuccessCount = 0;
  if (studentsToInsert.length > 0) {
    try {
      await Student.insertMany(studentsToInsert, { ordered: false });
      bulkSuccessCount = studentsToInsert.length;
      results.success += bulkSuccessCount;
    } catch (err) {
      // With ordered: false, some might succeed and some fail.
      results.failed += studentsToInsert.length;
      results.errors.push({ row: 'bulk', reason: `Bulk insert error: ${err.message}` });
    }
  }

  results.failed = normalizedRows.length - results.success - results.skipped;

  // Retrieve IDs of all imported / updated students for this file
  const allRegNos = normalizedRows.map(r => r.registerNumber).filter(Boolean);
  const dbStudents = await Student.find({ registerNumber: { $in: allRegNos } }, '_id');
  const importedStudentIds = dbStudents.map(s => s._id);

  // Save the uploaded file metadata and buffer to the database
  const uploadedFile = await UploadedFile.create({
    fileName: `student_import_${Date.now()}_${req.file.originalname}`,
    originalName: req.file.originalname || 'import.xlsx',
    fileData: req.file.buffer,
    mimeType: req.file.mimetype,
    size: req.file.size,
    studentIds: importedStudentIds,
    uploadedBy: req.user.id,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.UPLOAD,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: uploadedFile._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Excel upload: '${uploadedFile.originalName}' (${results.success} created/updated, ${results.skipped} skipped, ${results.failed} failed)`,
  });

  return sendSuccess(res, 200, 'Excel upload completed', results);
});

// GET all uploaded student Excel files
exports.getUploadedFiles = catchAsync(async (req, res) => {
  const { page: p, limit: l, skip } = getPagination(req.query);
  const [files, total] = await Promise.all([
    UploadedFile.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .populate('uploadedBy', 'name')
      .select('-fileData'), // Don't return the file buffer to save bandwidth
    UploadedFile.countDocuments(),
  ]);

  return sendPaginated(res, 'Uploaded files fetched', files, p, l, total);
});

// DELETE an uploaded student Excel file record (and optionally its imported students)
exports.deleteUploadedFile = catchAsync(async (req, res) => {
  const { deleteStudents } = req.query; // 'true' or 'false'
  const file = await UploadedFile.findById(req.params.id);
  if (!file) return sendError(res, 404, 'Uploaded file record not found.');

  if (deleteStudents === 'true' && file.studentIds && file.studentIds.length > 0) {
    // Hard delete all students imported by this file
    await Student.deleteMany({ _id: { $in: file.studentIds } });

    // Cascading delete student associated records
    await Attendance.deleteMany({ student: { $in: file.studentIds } });
    await Marks.deleteMany({ student: { $in: file.studentIds } });
    await StudentFeedback.deleteMany({ student: { $in: file.studentIds } });

    await createAuditLog({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.STUDENT,
      entityId: null,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      description: `Deleted ${file.studentIds.length} students imported from file '${file.originalName}'`,
    });
  }

  await file.deleteOne();

  await createAuditLog({
    action: 'DELETE',
    entity: 'UploadedFile',
    entityId: file._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted uploaded file record: '${file.originalName}' (imported students deleted: ${deleteStudents})`,
  });

  return sendSuccess(res, 200, 'Uploaded file record deleted successfully.');
});
