# Cloud Sync Setup (Firebase + Google OAuth)

This app supports optional cloud sync for tasks using:
- Google login (system browser OAuth Authorization Code + PKCE)
- Cloud Firestore (per-user storage)

The implementation is designed so the renderer stays UI-only. Network + tokens stay in the Electron main process.

## 1) Create/Select a Firebase Project
1. Create a Firebase project (or pick an existing one).
2. Enable Cloud Firestore (Native mode).

## 2) Enable Google Sign-In in Firebase Auth
1. Firebase Console → Authentication → Sign-in method.
2. Enable Google provider.

## 3) Create Google OAuth Client (Desktop / Installed App)
Create an OAuth client ID for a desktop/installed application.

Important:
- We target Windows.
- The primary callback plan is a custom URL scheme (deep link). Some OAuth client configurations may require a loopback redirect instead.

## 4) Configure the App

The Electron main process reads config from environment variables (preferred) and/or an internal config store.

Set these variables:
- `FIREBASE_WEB_API_KEY` (Firebase Web API key; not a secret)
- `FIREBASE_PROJECT_ID` (Firebase project id)
- `GOOGLE_OAUTH_CLIENT_ID` (Google OAuth client id for desktop)
- `OAUTH_REDIRECT_SCHEME` (deep link scheme, default: `todosoverlay`)

Example (PowerShell):
```powershell
$env:FIREBASE_WEB_API_KEY = "..."
$env:FIREBASE_PROJECT_ID = "my-project"
$env:GOOGLE_OAUTH_CLIENT_ID = "...apps.googleusercontent.com"
$env:OAUTH_REDIRECT_SCHEME = "todosoverlay"
```

## 5) Firestore Security Rules (recommended)

Use a per-user path to keep authorization simple:

- `users/{uid}/tasks/{taskId}`
- `users/{uid}/meta/order`

Rules sketch:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;

      match /tasks/{taskId} {
        allow read, create, update, delete:
          if request.auth != null && request.auth.uid == userId;
      }

      match /meta/{docId} {
        allow read, write:
          if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Deep Link Protocol (Windows)

The packaged app registers a custom URL protocol (default scheme: `todosoverlay`).

Notes:
- In dev mode, protocol registration can be unreliable. The app attempts to call `app.setAsDefaultProtocolClient()` on startup, but Windows may still require manual steps depending on how Electron is launched.
- In production, protocol registration should be handled by the installer (electron-builder `protocols` config).
