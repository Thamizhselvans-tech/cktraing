require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(async () => {
  // Auto-sync and self-heal existing student records (departments & passwords)
  try {
    const Student = require('./models/Student.model');
    const Department = require('./models/Department.model');
    const bcrypt = require('bcryptjs');
    const students = await Student.find().select('+password').populate('department');

    let repairedCount = 0;
    for (const student of students) {
      let modified = false;

      // Extract department code from Register Number (e.g. 22CSE001 -> CSE)
      const regNo = student.registerNumber.toUpperCase();
      const match = regNo.match(/\d+([A-Z]+)\d+/);
      const extractedCode = match ? match[1] : 'CSE';

      // 1. Resolve correct department based on extracted register number code (e.g. CSE)
      let correctDept = await Department.findOne({
        $or: [
          { code: { $regex: new RegExp(`^${extractedCode}$`, 'i') } },
          { name: { $regex: new RegExp(`^${extractedCode}$`, 'i') } }
        ]
      });
      if (!correctDept) {
        correctDept = await Department.create({
          name: extractedCode,
          code: extractedCode,
          description: 'Automatically created during startup repair',
          status: 'Active'
        });
      }
      const currentDeptId = student.department?._id || student.department;
      if (!currentDeptId || currentDeptId.toString() !== correctDept._id.toString()) {
        student.department = correctDept._id;
        modified = true;
      }

      // 2. Sync password to Department Code + Register Number (e.g. CSE22CSE001)
      if (student.mustChangePassword) {
        const deptCode = extractedCode.toUpperCase(); // e.g. CSE
        const defaultPassword = deptCode + regNo; // e.g. CSE22CSE001
        const isCorrect = await bcrypt.compare(defaultPassword, student.password);
        if (!isCorrect) {
          student.password = defaultPassword; // will be hashed by pre-save
          modified = true;
        }
      }

      if (modified) {
        await student.save();
        repairedCount++;
      }
    }
    if (repairedCount > 0) {
      console.log(`[Repair Migration] Successfully repaired and synced ${repairedCount} student records.`);
    }

    // Auto-create or sync coordinators for each department
    const DepartmentCoordinator = require('./models/DepartmentCoordinator.model');
    const depts = await Department.find({ status: 'Active' });
    let coordinatorSyncCount = 0;
    for (const dept of depts) {
      const deptCodeUpper = dept.code.toUpperCase();
      const codeLower = dept.code.toLowerCase();

      // Determine deptCode (e.g. cse) and coordId (e.g. 104) based on name and code
      const cleanName = dept.name.toUpperCase();
      let deptCode = dept.code.toLowerCase();
      let coordId = deptCodeUpper;
      if (cleanName.includes('CSE') || deptCodeUpper === '104' || deptCode === 'cse') {
        coordId = '104';
        deptCode = 'cse';
      } else if (cleanName.includes('AIDS') || cleanName.includes('ARTIFICIAL') || deptCodeUpper === '105' || deptCode === 'aids') {
        coordId = '105';
        deptCode = 'aids';
      } else if (cleanName.includes('IT') || cleanName.includes('INFORMATION') || deptCodeUpper === '205' || deptCode === 'it') {
        coordId = '205';
        deptCode = 'it';
      }

      const generatedUsername = `${coordId.toLowerCase()}${deptCode}`.toUpperCase();
      const defaultPassword = `${coordId.toLowerCase()}${deptCode}`; // e.g. 104cse

      let coordinator = await DepartmentCoordinator.findOne({ username: generatedUsername });
      if (!coordinator) {
        // Also look for older format to migrate it
        const oldCoord = await DepartmentCoordinator.findOne({ username: { $regex: new RegExp(`^${deptCodeUpper}$`, 'i') } });
        if (oldCoord) {
          oldCoord.username = generatedUsername;
          oldCoord.password = defaultPassword; // Will be hashed by pre-save hook
          oldCoord.mustChangePassword = true;
          await oldCoord.save();
          coordinatorSyncCount++;
        } else {
          coordinator = await DepartmentCoordinator.create({
            username: generatedUsername,
            password: defaultPassword, // hashed automatically by pre-save hook
            name: `${dept.name} Coordinator`,
            email: `coordinator.${codeLower}@tms.edu`,
            department: dept._id,
            status: 'Active',
            mustChangePassword: true,
          });
          coordinatorSyncCount++;
        }
      } else {
        // If they haven't changed password, verify it is set to defaultPassword
        if (coordinator.mustChangePassword) {
          // Select coordinator with password to compare
          const coordWithPwd = await DepartmentCoordinator.findById(coordinator._id).select('+password');
          if (coordWithPwd) {
            const isCorrect = await bcrypt.compare(defaultPassword, coordWithPwd.password);
            if (!isCorrect) {
              coordWithPwd.password = defaultPassword;
              await coordWithPwd.save();
              coordinatorSyncCount++;
            }
          }
        }
        if (coordinator.department?.toString() !== dept._id.toString()) {
          coordinator.department = dept._id;
          await coordinator.save();
          coordinatorSyncCount++;
        }
      }
    }
    if (coordinatorSyncCount > 0) {
      console.log(`[Coordinator Sync] Synced ${coordinatorSyncCount} coordinator accounts.`);
    }

    // Auto-clean orphaned records (where student has been deleted)
    const Attendance = require('./models/Attendance.model');
    const Marks = require('./models/Marks.model');
    const StudentFeedback = require('./models/StudentFeedback.model');
    const allStudentIds = (await Student.find({}, '_id')).map(s => s._id);

    const attResult = await Attendance.deleteMany({ student: { $nin: allStudentIds } });
    if (attResult.deletedCount > 0) {
      console.log(`[Database Cleanup] Deleted ${attResult.deletedCount} orphaned attendance records.`);
    }

    const marksResult = await Marks.deleteMany({ student: { $nin: allStudentIds } });
    if (marksResult.deletedCount > 0) {
      console.log(`[Database Cleanup] Deleted ${marksResult.deletedCount} orphaned marks records.`);
    }

    const fbResult = await StudentFeedback.deleteMany({ student: { $nin: allStudentIds } });
    if (fbResult.deletedCount > 0) {
      console.log(`[Database Cleanup] Deleted ${fbResult.deletedCount} orphaned feedback records.`);
    }
  } catch (err) {
    console.error('❌ Startup migrations failed:', err);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 TMS Server running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL}`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});
