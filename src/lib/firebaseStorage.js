rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app_data/{docId} {
      allow read: if true;
      allow write: if true;
    }
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if true;
    }
  }
      }
