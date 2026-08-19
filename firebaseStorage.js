import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Your web app's Firebase configuration (from Firebase Console > Project settings)
const firebaseConfig = {
  apiKey: "AIzaSyDC0NThlSGHHeYmAqxVgiRA1Q8nB61iI2o",
  authDomain: "wifi-home-722cd.firebaseapp.com",
  databaseURL: "https://wifi-home-722cd-default-rtdb.firebaseio.com",
  projectId: "wifi-home-722cd",
  storageBucket: "wifi-home-722cd.firebasestorage.app",
  messagingSenderId: "452512589725",
  appId: "1:452512589725:web:23a0c9d9be4826b968f174",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Every key (products_0, products_meta, orders, banners, categories, ...)
// is stored as its own document in a single "app_data" collection, with the
// JSON string in a "value" field. This keeps the exact same get/set/delete
// shape the app already uses (window.storage), so nothing else in App.jsx
// has to change — only the import at the top swaps over to this file.
export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, "app_data", key));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { key, value: data.value, shared: true };
  },

  async set(key, value) {
    await setDoc(doc(db, "app_data", key), { value });
    return { key, value, shared: true };
  },

  async delete(key) {
    await deleteDoc(doc(db, "app_data", key));
    return { key, deleted: true, shared: true };
  },
};
