import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseStorage.js";

const REVIEWS_COLLECTION = "reviews";

// Customer submits a review — always starts as "pending" until an admin
// approves it from the admin panel's রিভিউ tab.
export async function submitReview({ productId, userId, userName, rating, comment }) {
  await addDoc(collection(db, REVIEWS_COLLECTION), {
    productId,
    userId,
    userName,
    rating,
    comment,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

// Approved reviews for one product — shown publicly on the product page.
export async function getApprovedReviews(productId) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("productId", "==", productId),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// All pending reviews across every product — for the admin moderation queue.
export async function getPendingReviews() {
  const q = query(collection(db, REVIEWS_COLLECTION), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function approveReview(reviewId) {
  await updateDoc(doc(db, REVIEWS_COLLECTION, reviewId), { status: "approved" });
}

export async function rejectReview(reviewId) {
  // Rejected reviews are deleted outright rather than kept around.
  await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
}
