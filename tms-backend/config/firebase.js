const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(__dirname, "serviceAccountKey.json");

let db = null;
let app = null;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://training-module-87665-default-rtdb.firebaseio.com"
  });
  db = getDatabase(app);
  console.log("🔥 Firebase Realtime Database Initialized Successfully");
} else {
  console.warn("⚠️ Firebase serviceAccountKey.json not found at:", serviceAccountPath);
}

module.exports = { app, db };
