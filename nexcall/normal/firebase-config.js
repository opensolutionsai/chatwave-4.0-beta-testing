// NexCall Firebase Client Config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "nexcall-rtc-9382",
  appId: "1:628647302959:web:2b7d8ffc031ea3533af3da",
  storageBucket: "nexcall-rtc-9382.firebasestorage.app",
  apiKey: "AIzaSyD8N9QBpe6aFO5q6A9-2xNIGBI1UZI3hM4",
  authDomain: "nexcall-rtc-9382.firebaseapp.com",
  messagingSenderId: "628647302959",
  projectNumber: "628647302959"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, firebaseConfig };
