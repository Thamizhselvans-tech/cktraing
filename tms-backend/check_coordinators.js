require('dotenv').config();
const firebaseDb = require('./services/firebaseDb.service');

async function inspectCoordinators() {
  console.log('=== Inspecting Coordinators Node in Firebase ===');
  const coords = await firebaseDb.getAll('coordinators');
  console.log('Total Coordinators found:', coords.length);
  coords.forEach((c, idx) => {
    console.log(`\nCoordinator #${idx + 1}:`);
    console.log('  ID:', c._id || c.id);
    console.log('  Username:', c.username);
    console.log('  Name:', c.name);
    console.log('  DepartmentId:', c.departmentId);
    console.log('  Status:', c.status);
    console.log('  Password Hash/Plain:', c.password ? (c.password.length > 20 ? c.password.substring(0, 15) + '...' : c.password) : 'NONE');
  });

  const depts = await firebaseDb.getAll('departments');
  console.log('\nTotal Departments found:', depts.length);
  depts.forEach(d => {
    console.log(`  Dept ID: ${d._id}, Code: ${d.code}, Name: ${d.name}`);
  });

  process.exit(0);
}

inspectCoordinators().catch(err => {
  console.error(err);
  process.exit(1);
});
