require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const app = require('./app');
const { db } = require('./config/firebase');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 TMS Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL}`);
  if (db) {
    console.log(`🔥 Database: Firebase Realtime Database Connected`);
  } else {
    console.warn(`⚠️ Warning: Firebase Realtime Database is not initialized.`);
  }
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
