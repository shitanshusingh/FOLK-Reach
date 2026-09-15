// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAJeYiQZ-bE3cYFlZi0OeCKSw-9KtEGkQ",
  authDomain: "folk-reach.firebaseapp.com",
  projectId: "folk-reach",
  storageBucket: "folk-reach.firebasestorage.app",
  messagingSenderId: "1067348666124",
  appId: "1:1067348666124:web:9649c0ff81fc229b404b29",
  measurementId: "G-3JVQS9731M"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
