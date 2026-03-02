import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyARHMvPmz7ESgih9-lIOIy9RKLH8cdYPHc",
  authDomain: "mad-spin.firebaseapp.com",
  projectId: "mad-spin",
  storageBucket: "mad-spin.firebasestorage.app",
  messagingSenderId: "787459509584",
  appId: "1:787459509584:web:77d79c5efa3cb9f92b7055",
  measurementId: "G-48STQ9GZSL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
