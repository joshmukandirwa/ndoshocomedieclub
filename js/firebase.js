// Initialisation Firebase (Firestore) partagée par toutes les pages publiques.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const isConfigured = !String(firebaseConfig.apiKey).startsWith("VOTRE_");
export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = isConfigured ? getFirestore(app) : null;

export {
  collection, doc, addDoc, getDocs, getDoc, updateDoc, setDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
