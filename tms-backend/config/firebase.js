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

// 4. Built-in default fallback service account credentials for production deployment
if (!serviceAccount) {
  try {
    serviceAccount = {
      projectId: "training-module-87665",
      clientEmail: "firebase-adminsdk-fbsvc@training-module-87665.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCiE/44x1y2TKaA\n8+POwGfj+Xv5gbot088k4/3SzKGmSqKErpLU2ozjcgSLWrypgBTrriVVcEM1n9ZD\nlCd6K06TlWd0UN/OsFRxjMRZ/efOAIigHlvqfQP4ZuE5xIECIIHE/92Eb6WqxzrJ\n0UGzP2DbHuqB/s5axuqjZOQKleVCfF9AYXMs8zlU6pWhMOejcfVnvJ2nKPXE637k\nccEhvOvbA1f40aj7MwPtxXq1IOCgyjJ/N16+h/dP4AZzcveyo3nh5L0prLYSk1Sr\nEjax8wa2hF3HdSYbw4uRnszYaQpREusSk6fpAKdhFlWAfklymGhr6a7Rg5odx83C\nkNMZKrmhAgMBAAECggEAGLCiAAVCttSbYraEhAjkaqKlQ5+C/JsxCYYfsv6QO3RQ\nKJUtcfZvEvDaB16Fse58gWCQeGD3JBKawcWuc9poCGxwi5QMXACZhIi0mp7msod7\nSKUHTIPJ2IvXkITCQFAyZI+zr4qQeqEJ8BeMAiHL/+VIRRBLYCHAOa7TXFd0SrnI\ncQQaBaohOMkobuoU/DRdl3Os/LTytp6ZplOaBpEFEZo3MT3g+83Dz6CNOOiPphWL\nuJLDweaApRZ1RxrB7kfiMRrYdXZs0FxPlJhduJjQCkT26XD5rmNTXbcHkwcNm6Nb\nUPAOJhBpJ8NhXiVz3nareGDH24/NHIyI2wpfC7nL9wKBgQDTLhAhDeFpD4JJY1xd\nS5oxmMeuFn9ibHcFg8hiBz0axYU/WJzx62MbU69KDzNNXIm9fLRbfDGoYAKxn0lg\nurmnYUcVobMfJDUfp3mjFzSX1G3ScgbzE13L+u06fPZGsNC+w/dzsTUtDNYTT9kd\njookBYWMXRJGXJKSpAzP2Zt9awKBgQDEehqSz2HYm2boUwyB37MaAn2wE+bCmkIH\nX65F4Ub9apeTvFIljL94DDlgCUJSVihvaq8b6PRG0aEw1pJqIcDpIc1spgSVQc4M\nKxLelWI+2l6ewpsBkoG6/2TUZcQcZRBqVAls2I7KKXdFUVS34x5pJOg2SxCTBKS5\n5JIwz+q8IwKBgQDP/+C3DdrlBfeHnSwOYDahfx+94j7ZjIe2kNQ/aW3P/ph9iiQb\nS4M0GTrfsRUQr4Kjdj6WlT673sUIeiFl+sR9jhzbu4aXt6vzX5s4/dQ5b2w0CUe7\B2otTRt3rjlL6z/PhWknNHVxx+Da6Jyqtght7lpZpBop32gmsxpDZsv1vQKBgFOJ\nuyy6wlaP1JRpY0MBMyyW7IvmGlKZtgNemkGaBE4ReTtWcfMHQg2v3OFJboqFmZGt\n4aBTTzGhRhD22rAHg/db6PUOLZqsrQgddFtxVqF0xZBpG/DyMvioSF3KmzSbf/xF\nmPBPr36jXNP7PbMl/TMlfxo+lmB8M/HaDpJ0hNDTAoGAYFnEywxjMRGAHB5jpfwx\nPbdgD0WxWPKnEO2wwE2IdQ3cIrAs+wXOgXPNaLmz5JiIPO1c0ieEV/SDdINsGYFx\nGgqYcawzcmomvckBBqW0E5JhfhECgDpxahgkZTDjEt/Ktd6WTxLFRhe6Rye2uJn2\nQB5fK7DTzdohmPNqNOgV2wc=\n-----END PRIVATE KEY-----\n"
    };
  } catch (e) {
    console.error("❌ Fallback service account key parse error:", e.message);
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
  console.error("❌ Firebase could not be initialized.");
}

module.exports = { app, db };
