import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Load Firebase configuration from environment variables with safe defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBYO8yse2bfU4S6amG98mu9aH8pN2iaeSw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "doc-ai-beb32.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "doc-ai-beb32",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "doc-ai-beb32.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "715194336100",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:715194336100:web:b995a6b11e22ada5347071",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-W9DQMD3ZRB"
};

// Developer validation check: log clear console warnings if essential keys are missing
const requiredKeys = ["apiKey", "authDomain", "projectId"];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.warn(
    `[Firebase Configuration Warning]: Missing required configuration key(s): ${missingKeys.join(
      ", "
    )}. Please ensure VITE_FIREBASE_* environment variables are set in frontend/.env`
  );
}

// Initialize Firebase App instance
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally
let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

// Export Auth & GoogleAuthProvider singleton instances
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider defaults
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export { analytics };
export default app;
