import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBvayfmxpPUEGMf-eA6fPW0kr1vnJ7SMbM",
  authDomain: "activity-d7bc6.firebaseapp.com",
  projectId: "activity-d7bc6",
  storageBucket: "activity-d7bc6.firebasestorage.app",
  messagingSenderId: "400040586882",
  appId: "1:400040586882:web:781a8be51942718e6d4e9b",
  measurementId: "G-JLCFBHY7FR"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();