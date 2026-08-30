import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { app } from "./firebaseStorage.js";

export const auth = getAuth(app);

// Customer sign-up — separate system from the admin password gate.
// Requires Email/Password sign-in to be turned on in Firebase Console >
// Authentication > Sign-in method.
export async function customerSignUp(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  return cred.user;
}

export async function customerSignIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function customerSignOut() {
  await signOut(auth);
}

// Calls callback(user) whenever login state changes (user is null when
// signed out). Returns an unsubscribe function — call it on unmount.
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
