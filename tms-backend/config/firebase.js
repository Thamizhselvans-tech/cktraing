const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const path = require("path");
const fs = require("fs");

let db = null;
let app = null;
let serviceAccount = null;

// 1. Check if FIREBASE_SERVICE_ACCOUNT_JSON environment variable is provided
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  } catch (err) {
    console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT_JSON env var:", err.message);
  }
}

// 2. Check if individual FIREBASE_PRIVATE_KEY, CLIENT_EMAIL env vars are provided
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || "training-module-87665",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

// 3. Fallback to local serviceAccountKey.json file if present
if (!serviceAccount) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    console.warn("⚠️ Firebase serviceAccountKey.json file not found at:", serviceAccountPath);
  }
}

if (serviceAccount) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://training-module-87665-default-rtdb.firebaseio.com"
  });
  db = getDatabase(app);
  console.log("🔥 Firebase Realtime Database Initialized Successfully");
} else {
  console.error("❌ Firebase could not be initialized. Please set FIREBASE_SERVICE_ACCOUNT_JSON env var on Render!");
}

module.exports = { app, db };
