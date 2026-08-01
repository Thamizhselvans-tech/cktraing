require('dotenv').config();

const app = require('./app');
const { db } = require('./config/firebase');

const firebaseDb = require('./services/firebaseDb.service');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TMS Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL}`);
  if (db) {
    console.log(`🔥 Database: Firebase Realtime Database Connected`);
    firebaseDb.preloadCache().catch(err => console.warn('Cache pre-warm warning:', err.message));
  } else {
    console.warn(`⚠️ Warning: Firebase Realtime Database is not initialized.`);
  }
});

// Handle unhandled promise rejections gracefully without crashing server process
process.on('unhandledRejection', (err) => {
  console.error('⚠️ [Server] Unhandled Rejection (handled safely):', err?.message || err);
});

// Handle uncaught exceptions gracefully without crashing server process
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server] Uncaught Exception (handled safely):', err?.message || err);
});
