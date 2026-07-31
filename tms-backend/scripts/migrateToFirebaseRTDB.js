require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const { db } = require('../config/firebase');

if (!db) {
  console.error("❌ Firebase Database is not initialized. Please ensure 'serviceAccountKey.json' is inside 'tms-backend/config/' folder.");
  process.exit(1);
}

// Require Mongoose Models
const Department = require('../models/Department.model');
const Student = require('../models/Student.model');
const Admin = require('../models/Admin.model');
const DepartmentCoordinator = require('../models/DepartmentCoordinator.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB...');

    // 1. Departments
    const depts = await Department.find();
    console.log(`📦 Migrating ${depts.length} Departments to Firebase Realtime Database...`);
    const deptObj = {};
    for (const d of depts) {
      deptObj[d._id.toString()] = {
        id: d._id.toString(),
        name: d.name,
        code: d.code,
        description: d.description || '',
        status: d.status || 'Active',
        createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(deptObj).length > 0) {
      await db.ref('departments').update(deptObj);
    }

    // 2. Admins
    const admins = await Admin.find().select('+password');
    console.log(`📦 Migrating ${admins.length} Admins...`);
    const adminObj = {};
    for (const a of admins) {
      adminObj[a._id.toString()] = {
        id: a._id.toString(),
        username: a.username,
        password: a.password,
        name: a.name,
        email: a.email || '',
        isActive: a.isActive ?? true,
        createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(adminObj).length > 0) {
      await db.ref('admins').update(adminObj);
    }

    // 3. Coordinators
    const coords = await DepartmentCoordinator.find().select('+password');
    console.log(`📦 Migrating ${coords.length} Coordinators...`);
    const coordObj = {};
    for (const c of coords) {
      coordObj[c._id.toString()] = {
        id: c._id.toString(),
        username: c.username,
        password: c.password,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        departmentId: c.department ? c.department.toString() : null,
        status: c.status || 'Active',
        mustChangePassword: c.mustChangePassword ?? true,
        createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(coordObj).length > 0) {
      await db.ref('coordinators').update(coordObj);
    }

    // 4. Students
    const students = await Student.find().select('+password');
    console.log(`📦 Migrating ${students.length} Students...`);
    const studentObj = {};
    for (const s of students) {
      studentObj[s._id.toString()] = {
        id: s._id.toString(),
        registerNumber: s.registerNumber,
        name: s.name,
        email: s.email || '',
        password: s.password,
        mustChangePassword: s.mustChangePassword ?? true,
        departmentId: s.department ? s.department.toString() : null,
        year: s.year || 1,
        batch: s.batch || '',
        phone: s.phone || '',
        status: s.status || 'Active',
        profilePhoto: s.profilePhoto || null,
        createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(studentObj).length > 0) {
      await db.ref('students').update(studentObj);
    }

    // 5. Attendance
    const attendanceRecords = await Attendance.find();
    console.log(`📦 Migrating ${attendanceRecords.length} Attendance records...`);
    const attObj = {};
    for (const att of attendanceRecords) {
      attObj[att._id.toString()] = {
        id: att._id.toString(),
        studentId: att.student ? att.student.toString() : null,
        departmentId: att.department ? att.department.toString() : null,
        date: att.date ? att.date.toISOString() : new Date().toISOString(),
        morningSession: att.morningSession || false,
        afternoonSession: att.afternoonSession || false,
        percentage: att.percentage || 0,
        markedBy: att.markedBy ? att.markedBy.toString() : null,
        isLocked: att.isLocked || false,
        createdAt: att.createdAt ? att.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(attObj).length > 0) {
      await db.ref('attendance').update(attObj);
    }

    // 6. Marks
    const marksRecords = await Marks.find();
    console.log(`📦 Migrating ${marksRecords.length} Marks records...`);
    const markObj = {};
    for (const m of marksRecords) {
      markObj[m._id.toString()] = {
        id: m._id.toString(),
        studentId: m.student ? m.student.toString() : null,
        departmentId: m.department ? m.department.toString() : null,
        mockTest: m.mockTest || 0,
        aptitude: m.aptitude || 0,
        technical: m.technical || 0,
        total: m.total || 0,
        average: m.average || 0,
        enteredBy: m.enteredBy ? m.enteredBy.toString() : null,
        isVerified: m.isVerified || false,
        createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()
      };
    }
    if (Object.keys(markObj).length > 0) {
      await db.ref('marks').update(markObj);
    }

    console.log('🎉 ALL DATA MIGRATED SUCCESSFULLY TO FIREBASE REALTIME DATABASE!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
}

migrateData();
