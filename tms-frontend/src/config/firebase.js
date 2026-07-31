import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD5_jzRz-tE4EZU_nHofdqEuPOA818Ug-Y",
  authDomain: "training-module-87665.firebaseapp.com",
  databaseURL: "https://training-module-87665-default-rtdb.firebaseio.com",
  projectId: "training-module-87665",
  storageBucket: "training-module-87665.firebasestorage.app",
  messagingSenderId: "660527257008",
  appId: "1:660527257008:web:6693d4a0479976cb557275",
  measurementId: "G-E4M322ED5L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, database, analytics };
export default app;
