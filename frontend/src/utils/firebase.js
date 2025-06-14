// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // ✅ Import this

const firebaseConfig = {
  apiKey: "AIzaSyCCcMGjaaIc8NPHe4dhaHT79IJ04-KD0M0",
  authDomain: "todo-5a841.firebaseapp.com",
  projectId: "todo-5a841",
  storageBucket: "todo-5a841.appspot.com",
  messagingSenderId: "667719879724",
  appId: "1:667719879724:web:528d8ad4119ed087359589",
  measurementId: "G-HHVJDP0B9J"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);       // ✅ Works now
export const db = getFirestore(app); 
export const storage = getStorage(app);
