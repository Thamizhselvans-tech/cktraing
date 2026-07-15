// Application-wide constants

const ROLES = {
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  STUDENT: 'student',
};

const STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const ATTENDANCE_PERCENTAGE = {
  FULL: 100,
  HALF: 50,
  ZERO: 0,
};

const TIMETABLE_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const SCHEDULE_TYPES = {
  MEETING: 'meeting',
  PLACEMENT: 'placement',
  FACULTY_MEETING: 'faculty_meeting',
  COORDINATOR_MEETING: 'coordinator_meeting',
  OTHER: 'other',
};

const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UNLOCK: 'UNLOCK',
  LOCK: 'LOCK',
  VERIFY: 'VERIFY',
  RESET_PASSWORD: 'RESET_PASSWORD',
  UPLOAD: 'UPLOAD',
};

const AUDIT_ENTITIES = {
  STUDENT: 'Student',
  COORDINATOR: 'Coordinator',
  DEPARTMENT: 'Department',
  ATTENDANCE: 'Attendance',
  MARKS: 'Marks',
  FEEDBACK: 'Feedback',
  INTERNAL_TIMETABLE: 'InternalTimetable',
  EXTERNAL_TIMETABLE: 'ExternalTimetable',
  ADMIN_SCHEDULE: 'AdminSchedule',
};

const TRAINING_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  GENERAL: 'general',
};

const COMPANIES = [
  'Infosys', 'TCS', 'Zoho', 'CTS', 'HCL', 'Wipro', 'Accenture', 'IBM',
  'Cognizant', 'Capgemini', 'Tech Mahindra', 'L&T Infotech', 'Mindtree',
  'Mphasis', 'Hexaware', 'NIIT Technologies', 'Birlasoft', 'Mastech',
  'Other'
];

const MAX_MARKS = 100;
const MAX_FEEDBACK_CHARS = 500;
const FEEDBACK_EDIT_HOURS = 24;
const BCRYPT_ROUNDS = 12;
const JWT_COOKIE_NAME = 'tms_token';

module.exports = {
  ROLES,
  STATUS,
  ATTENDANCE_PERCENTAGE,
  TIMETABLE_STATUS,
  SCHEDULE_TYPES,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  TRAINING_TYPES,
  COMPANIES,
  MAX_MARKS,
  MAX_FEEDBACK_CHARS,
  FEEDBACK_EDIT_HOURS,
  BCRYPT_ROUNDS,
  JWT_COOKIE_NAME,
};
