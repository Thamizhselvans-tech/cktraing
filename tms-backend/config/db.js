const mongoose = require('mongoose');
const dns = require('dns');

// Fallback to reliable public DNS servers if local DNS blocks SRV queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📚 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

// Handle mongoose connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

module.exports = connectDB;
