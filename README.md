# wifi home

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and set VITE_ADMIN_PASSWORD to whatever you want your admin password to be
npm run dev
```

## Firestore security rules

Right now the database was created in test mode, which means **anyone**
can read and write it — fine for getting started, but before real
customers start using the site, tighten it up in Firebase Console >
Firestore Database > Rules. A reasonable starting point, since only the
admin panel writes data and the storefront only reads it:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app_data/{docId} {
      allow read: if true;
      allow write: if false; // tighten this once you add real auth
    }
  }
}
```

(Because this site's admin login is a simple front-end password check
rather than real Firebase Authentication, locking down writes properly
means adding Firebase Auth later. Until then, treat the site as
low-risk / trusted-users-only.)

## Deploying to Vercel

1. Push this project to the `wifi-home-` GitHub repo (replacing the
   empty `src` folder that's there now).
2. In Vercel, import the repo (framework preset: Vite).
3. In Vercel Project Settings > Environment Variables, add
   `VITE_ADMIN_PASSWORD` with your chosen password.
4. Deploy.

## What changed from the Claude.ai preview version

- `window.storage` (Claude.ai-only) → replaced with
  `src/lib/firebaseStorage.js`, which reads/writes the exact same
  keys as Firestore documents, so all the admin panel logic
  (products, orders, banners, categories) works unchanged.
- `adminSignIn` from Claude's `storageShim.js` (Claude.ai-only) →
  replaced with `src/lib/adminAuth.js`, a simple password check
  against the `VITE_ADMIN_PASSWORD` environment variable.
