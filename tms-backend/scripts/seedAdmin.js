/**
 * Admin Seed Script
 * Run: node scripts/seedAdmin.js
 * Seeds the initial admin account with credentials from .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin.model');
const connectDB = require('../config/db');

const seedAdmin = async () => {
  try {
    await connectDB();

    const username = process.env.ADMIN_USERNAME || 'Admin911@ck';
    const password = process.env.ADMIN_PASSWORD || 'Ckcet@tp11';
    const name = process.env.ADMIN_NAME || 'System Administrator';
    const email = process.env.ADMIN_EMAIL || 'admin@tms.edu';

    const existing = await Admin.findOne({ username });

    if (existing) {
      console.log(`\n⚠️  Admin '${username}' already exists. Skipping.`);
      console.log('   To reset, delete the admin document from MongoDB and re-run.');
    } else {
      const admin = await Admin.create({ username, password, name, email });
      console.log(`\n✅ Admin seeded successfully!`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Name:     ${name}`);
      console.log(`   ID:       ${admin._id}`);
      console.log('\n   ⚠️  IMPORTANT: Change this password immediately after first login!');
    }

    await mongoose.disconnect();
    console.log('\n🔌 Database disconnected.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
