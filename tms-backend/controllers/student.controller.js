const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, STATUS, ROLES, BCRYPT_ROUNDS } = require('../config/constants');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');

// GET all students
exports.getAllStudents = catchAsync(async (req, res) => {
  const { search, department, status: statusFilter, year } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let rawStudents = await firebaseDb.getAll('students');

  // Populate department info for all students first so search & filtering work on department code & name
  let students = await firebaseDb.populateDepartmentMany(rawStudents);

  if (statusFilter && statusFilter !== 'all') {
    students = students.filter(s => (s.status || 'Active') === statusFilter);
  } else if (!statusFilter) {
    students = students.filter(s => (s.status || 'Active') === STATUS.ACTIVE);
  }

  if (department && department !== 'all') {
    students = students.filter(s => 
      s.departmentId === department ||
      s.department?._id === department ||
      (s.department?.code && s.department.code.toLowerCase() === department.toLowerCase()) ||
      (s.department?.name && s.department.name.toLowerCase() === department.toLowerCase())
    );
  }

  if (year) {
    students = students.filter(s => Number(s.year) === Number(year));
  }

  if (search) {
    const q = search.toLowerCase().trim();
    students = students.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.officialGmail && s.officialGmail.toLowerCase().includes(q)) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.batch && s.batch.toLowerCase().includes(q)) ||
      (s.department?.code && s.department.code.toLowerCase().includes(q)) ||
      (s.department?.name && s.department.name.toLowerCase().includes(q))
    );
  }

  students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const sanitized = students.map(({ password, ...rest }) => rest);

  const total = sanitized.length;
  const paginated = sanitized.slice(skip, skip + l);

  return sendPaginated(res, 'Students fetched', paginated, p, l, total);
});

// GET student by ID
exports.getStudent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  if (role === ROLES.STUDENT && userId.toString() !== id.toString()) {
    return sendError(res, 403, 'You can only view your own profile.');
  }

  const rawStudent = await firebaseDb.getById('students', id);
  if (!rawStudent) return sendError(res, 404, 'Student not found.');

  const student = await firebaseDb.populateDepartment(rawStudent);
  delete student.password;

  return sendSuccess(res, 200, 'Student fetched', student);
});

// GET students by department
exports.getStudentsByDepartment = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { page: p, limit: l } = getPagination(req.query);

  if (!deptId || deptId === 'undefined' || deptId === 'null') {
    return sendPaginated(res, 'Students fetched', [], 1, l, 0);
  }

  const dept = await firebaseDb.getById('departments', deptId);
  const deptCode = dept ? dept.code?.toLowerCase() : null;
  const deptName = dept ? dept.name?.toLowerCase() : null;

  let students = await firebaseDb.find('students', s => {
    const isDeptMatch = s.departmentId === deptId || 
                        (deptCode && s.departmentId?.toLowerCase() === deptCode) ||
                        (deptName && s.departmentId?.toLowerCase() === deptName);
    return isDeptMatch && (s.status || 'Active') === STATUS.ACTIVE;
  });

  const { search } = req.query;
  if (search) {
    const q = search.toLowerCase();
    students = students.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }

  students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const populated = await firebaseDb.populateDepartmentMany(students);
  const sanitized = populated.map(({ password, ...rest }) => rest);

  const total = sanitized.length;
  const page = Math.max(1, parseInt(p) || 1);
  const skip = (page - 1) * l;
  const paginated = sanitized.slice(skip, skip + l);

  return sendPaginated(res, 'Students fetched', paginated, page, l, total);
});

// POST create student
exports.createStudent = catchAsync(async (req, res) => {
  const { registerNumber, username, name, email, department, year, batch, phone, password } = req.body;

  if (!registerNumber || !name || !department) {
    return sendError(res, 400, 'Register number, name, and department are required.');
  }

  const upperRegNo = registerNumber.trim().toUpperCase();
  const studentUsername = (username || registerNumber).trim();

  const existing = await firebaseDb.findOne('students', s => 
    s.registerNumber?.toUpperCase() === upperRegNo || 
    (username && s.username?.toLowerCase() === studentUsername.toLowerCase())
  );
  if (existing) {
    return sendError(res, 409, `Student with register number or username '${registerNumber}' already exists.`);
  }

  const dept = await firebaseDb.getById('departments', department);
  if (!dept || (dept.status || 'Active') === STATUS.INACTIVE) {
    return sendError(res, 404, 'Department not found or inactive.');
  }

  const defaultPassword = password || `${dept.code}${upperRegNo}`;
  const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

  const student = await firebaseDb.create('students', {
    registerNumber: upperRegNo,
    username: studentUsername,
    password: hashedPassword,
    name,
    email: email || '',
    departmentId: department,
    year: Number(year) || 1,
    batch: batch || '',
    phone: phone || '',
    status: STATUS.ACTIVE,
    mustChangePassword: !password,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created student '${name}' (${upperRegNo})`,
  });

  const result = await firebaseDb.populateDepartment(student);
  delete result.password;
  return sendSuccess(res, 201, 'Student created successfully', result);
});

// PUT update student
exports.updateStudent = catchAsync(async (req, res) => {
  const { username, name, email, department, year, batch, phone, status, password } = req.body;
  const student = await firebaseDb.getById('students', req.params.id);
  if (!student) return sendError(res, 404, 'Student not found.');

  const updates = {};
  if (username) updates.username = username.trim();
  if (name) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (department) updates.departmentId = department;
  if (year) updates.year = Number(year);
  if (batch) updates.batch = batch;
  if (phone !== undefined) updates.phone = phone;
  if (status) updates.status = status;
  if (password) {
    updates.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const updated = await firebaseDb.update('students', req.params.id, updates);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: student,
    description: `Updated student '${updated.name}' (${updated.registerNumber})`,
  });

  const result = await firebaseDb.populateDepartment(updated);
  delete result.password;
  return sendSuccess(res, 200, 'Student updated successfully', result);
});

// DELETE (soft delete) student
exports.deleteStudent = catchAsync(async (req, res) => {
  const student = await firebaseDb.getById('students', req.params.id);
  if (!student) return sendError(res, 404, 'Student not found.');

  await firebaseDb.update('students', req.params.id, { status: STATUS.INACTIVE });

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Soft-deleted student '${student.name}' (${student.registerNumber})`,
  });

  return sendSuccess(res, 200, 'Student deactivated successfully.');
});

// GET uploaded excel files history
exports.getUploadedFiles = catchAsync(async (req, res) => {
  const { page: p, limit: l, skip } = getPagination(req.query);
  let files = await firebaseDb.getAll('excel_uploads');
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = files.length;
  const paginated = files.slice(skip, skip + l);

  return sendPaginated(res, 'Uploaded files fetched', paginated, p, l, total);
});

// DELETE uploaded file history (automatically deletes imported students)
exports.deleteUploadedFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deleteStudents = req.query.deleteStudents !== 'false';

  const fileDoc = await firebaseDb.getById('excel_uploads', id);
  if (!fileDoc) return sendError(res, 404, 'Uploaded file record not found.');

  let deletedStudentsCount = 0;
  if (deleteStudents && fileDoc.importedStudentIds?.length) {
    for (const sId of fileDoc.importedStudentIds) {
      await firebaseDb.remove('students', sId);
      deletedStudentsCount++;
    }
  }

  await firebaseDb.remove('excel_uploads', id);

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: 'ExcelUpload',
    entityId: id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted uploaded file record ${id} along with ${deletedStudentsCount} imported students`,
  });

  return sendSuccess(res, 200, `Uploaded file and ${deletedStudentsCount} imported student details deleted successfully.`);
});

// POST upload students Excel (Ultra-fast Batch Optimized)
exports.uploadStudentsExcel = catchAsync(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Please upload an Excel file.');

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) {
    return sendError(res, 400, 'Excel file is empty.');
  }

  const results = { total: rows.length, success: 0, failed: 0, errors: [] };
  const importedStudentIds = [];
  const atomicUpdates = {};
  const now = new Date().toISOString();

  // 1. Single-query prefetch for existing departments & students
  const [existingDepts, existingStudents] = await Promise.all([
    firebaseDb.getAll('departments'),
    firebaseDb.getAll('students')
  ]);

  const deptMap = {};
  existingDepts.forEach(d => {
    if (d.code) deptMap[d.code.toUpperCase()] = d._id;
    if (d.name) deptMap[d.name.toUpperCase()] = d._id;
  });

  const studentMap = {};
  existingStudents.forEach(s => {
    if (s.registerNumber) studentMap[s.registerNumber.toUpperCase()] = s;
  });

  // Flexible Excel column extraction helper
  const getRowVal = (row, keys) => {
    for (const k of Object.keys(row)) {
      const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const target of keys) {
        const cleanTarget = target.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanTarget) {
          return String(row[k] || '').trim();
        }
      }
    }
    return '';
  };

  // Pre-process rows to prepare data for batch operations
  const preparedRows = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const email = getRowVal(row, [
      'Official Gmail ID', 'Official Gmail Id', 'Official Gmail', 'Official Email ID',
      'Official Email', 'Official Mail', 'OfficialGmail', 'OfficialEmail',
      'Gmail ID', 'Gmail Id', 'Gmail', 'Email ID', 'Email Id', 'Email', 'email', 'Official ID', 'OfficialId'
    ]);

    const rawRegNo = getRowVal(row, [
      'Register No', 'Register Number', 'Reg No', 'regNo', 'RegisterNo', 'Roll No', 'RollNo'
    ]);

    const regNo = (rawRegNo || email).toUpperCase();

    const username = getRowVal(row, [
      'Username', 'username', 'User Name', 'user_name'
    ]) || email || regNo;

    const name = getRowVal(row, [
      'Name', 'Student Name', 'Full Name', 'student_name'
    ]);

    const deptCode = getRowVal(row, [
      'Department', 'Dept', 'department', 'Branch'
    ]).toUpperCase() || 'CSE';

    const rawPassword = getRowVal(row, [
      'Official Password', 'Password', 'password', 'Pass', 'pwd', 'Passcode'
    ]);

    const year = Number(getRowVal(row, ['Year', 'year', 'Year of Study']) || 1);
    const batch = getRowVal(row, ['Batch', 'batch']);
    const phone = getRowVal(row, ['Phone', 'phone', 'Mobile']);

    if (!regNo || !name) {
      results.failed++;
      results.errors.push({ row: rowNum, reason: 'Name and Register No / Official Gmail are required.' });
      continue;
    }

    let departmentId = deptMap[deptCode];
    if (!departmentId) {
      const newKey = firebaseDb.getNewKey('departments');
      const newDeptPayload = {
        id: newKey,
        _id: newKey,
        name: deptCode,
        code: deptCode,
        description: 'Automatically created during student excel import',
        status: STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now
      };
      atomicUpdates[`departments/${newKey}`] = newDeptPayload;
      departmentId = newKey;
      deptMap[deptCode] = departmentId;
    }

    preparedRows.push({
      regNo,
      username,
      name,
      email,
      departmentId,
      deptCode,
      rawPassword,
      year,
      batch,
      phone,
      existingStudent: studentMap[regNo]
    });
  }

  // 2. Parallel password hashing for all valid rows
  const passwordHashes = await Promise.all(
    preparedRows.map(async (r) => {
      const pwdToHash = r.rawPassword || `${r.deptCode}${r.regNo}`;
      return bcrypt.hash(pwdToHash, 6);
    })
  );

  // 3. Assemble atomic batch payload
  for (let i = 0; i < preparedRows.length; i++) {
    const r = preparedRows[i];
    const hashedPassword = passwordHashes[i];

    if (r.existingStudent) {
      const existingId = r.existingStudent._id;
      const updates = {
        updatedAt: now,
      };
      if (r.email) {
        updates.email = r.email;
        updates.officialGmail = r.email;
      }
      if (r.username && r.username !== r.regNo) updates.username = r.username;
      if (r.name) updates.name = r.name;
      if (r.departmentId) updates.departmentId = r.departmentId;

      if (r.rawPassword) {
        updates.password = hashedPassword;
        updates.mustChangePassword = false;
      }

      Object.keys(updates).forEach(key => {
        atomicUpdates[`students/${existingId}/${key}`] = updates[key];
      });

      importedStudentIds.push(existingId);
      results.success++;
    } else {
      const newStudentId = firebaseDb.getNewKey('students');
      const studentPayload = {
        id: newStudentId,
        registerNumber: r.regNo,
        username: r.username || r.email || r.regNo,
        password: hashedPassword,
        name: r.name,
        email: r.email,
        officialGmail: r.email,
        departmentId: r.departmentId,
        year: r.year,
        batch: r.batch,
        phone: r.phone,
        status: STATUS.ACTIVE,
        mustChangePassword: !r.rawPassword,
        createdAt: now,
        updatedAt: now
      };

      atomicUpdates[`students/${newStudentId}`] = studentPayload;
      importedStudentIds.push(newStudentId);
      results.success++;
    }
  }

  // 4. Record upload history doc in atomic payload
  const uploadKey = firebaseDb.getNewKey('excel_uploads');
  atomicUpdates[`excel_uploads/${uploadKey}`] = {
    id: uploadKey,
    filename: req.file.originalname,
    totalRecords: results.total,
    successCount: results.success,
    failedCount: results.failed,
    importedStudentIds,
    uploadedBy: req.user.id,
    createdAt: now,
    updatedAt: now
  };

  // 5. Execute 1 SINGLE atomic network write for the entire Excel file!
  await firebaseDb.multiUpdate(atomicUpdates);

  createAuditLog({
    action: AUDIT_ACTIONS.IMPORT,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: uploadKey,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Imported students Excel '${req.file.originalname}': success=${results.success}, failed=${results.failed}`,
  }).catch(err => console.error('AuditLog error:', err.message));

  return sendSuccess(res, 200, 'Excel import processed successfully', results);
});
