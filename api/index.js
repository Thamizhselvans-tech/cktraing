require('dotenv').config();

let app;
try {
  app = require('../tms-backend/app');
} catch (e1) {
  try {
    app = require('../../tms-backend/app');
  } catch (e2) {
    try {
      app = require('./tms-backend/app');
    } catch (e3) {
      app = require('./app');
    }
  }
}

module.exports = app;
