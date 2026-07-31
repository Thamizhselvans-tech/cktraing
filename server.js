const path = require('path');
const backendDir = path.join(__dirname, 'tms-backend');
process.chdir(backendDir);
require(path.join(backendDir, 'server.js'));
