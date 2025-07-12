
# Firebase Configuration Setup

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "society-visitor-management")
4. Follow the setup wizard

## Step 2: Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location

## Step 3: Enable Firebase Storage
1. In Firebase Console, go to "Storage"
2. Click "Get started"
3. Accept the default security rules (for development)

## Step 4: Get Firebase Configuration
1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register your app with a name
5. Copy the Firebase configuration object

## Step 5: Update script.js
Replace the firebaseConfig object in script.js with your actual configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```

## Step 6: Security Rules (Optional for Production)
For production, update Firestore rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Features Included:
- ✅ Visitor entry form with photo capture
- ✅ Wing/Floor/Flat selection based on building structure
- ✅ Firebase Firestore data storage
- ✅ Firebase Storage for photos
- ✅ Records viewing with filters
- ✅ Responsive design
- ✅ Real-time camera access
- ✅ Date and wing-based filtering
