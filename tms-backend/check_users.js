require('dotenv').config();
const firebaseDb = require('./services/firebaseDb.service');
const bcrypt = require('bcryptjs');

async function check() {
  console.log('=== Checking Coordinators ===');
  const coordinators = await firebaseDb.getAll('coordinators');
  console.log('Total Coordinators:', coordinators.length);
  coordinators.forEach((c, idx) => {
    console.log(`[Coordinator ${idx+1}] Username: "${c.username}", Name: "${c.name}", Status: "${c.status}", PwdHash: "${c.password ? c.password.substring(0, 15) : 'NONE'}..."`);
  });

  console.log('\n=== Checking Students (Sample 5) ===');
  const students = await firebaseDb.getAll('students');
  console.log('Total Students:', students.length);
  students.slice(0, 5).forEach((s, idx) => {
    console.log(`[Student ${idx+1}] RegNo: "${s.registerNumber}", Email: "${s.email}", OfficialGmail: "${s.officialGmail}", Username: "${s.username}", Name: "${s.name}", Status: "${s.status}", MustChangePwd: ${s.mustChangePassword}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
