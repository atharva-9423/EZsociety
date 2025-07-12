
# Firebase Realtime Database Setup for EzSociety

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "ezsociety-app")
4. Follow the setup wizard

## Step 2: Enable Realtime Database
1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)

## Step 3: Get Firebase Configuration
1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register your app with name "EzSociety"
5. Copy the Firebase configuration object

## Step 4: Update Configuration in script.js
Replace the firebaseConfig object in script.js with your actual configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```

## Step 5: Database Structure
The app will create the following structure in your Realtime Database:
```
ezsociety-app/
├── visitors/
│   ├── visitor-id-1/
│   │   ├── visitorName: "John Doe"
│   │   ├── visitorPhone: "1234567890"
│   │   ├── wing: "A"
│   │   ├── floor: "1"
│   │   ├── flatNumber: "A-101"
│   │   ├── purpose: "Personal visit"
│   │   ├── timestamp: "2024-01-15T10:30:00Z"
│   │   └── photoURL: "base64-image-data"
│   └── ...
├── residents/
│   ├── resident-id-1/
│   │   ├── name: "Jane Smith"
│   │   ├── phone: "9876543210"
│   │   ├── wing: "A"
│   │   ├── floor: "1"
│   │   └── flat: "A-101"
│   └── ...
├── complaints/
│   ├── complaint-id-1/
│   │   ├── complaintType: "maintenance"
│   │   ├── complaintSubject: "Water leak"
│   │   ├── complaintDescription: "Leak in bathroom"
│   │   ├── status: "pending"
│   │   └── timestamp: "2024-01-15T09:00:00Z"
│   └── ...
└── notices/
    ├── notice-id-1/
    │   ├── title: "Maintenance Notice"
    │   ├── type: "maintenance"
    │   ├── content: "Water maintenance scheduled"
    │   ├── author: "Admin"
    │   └── timestamp: "2024-01-15T08:00:00Z"
    └── ...
```

## Step 6: Security Rules (Optional for Production)
For production, update Realtime Database rules:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## Features:
- ✅ Real-time data synchronization
- ✅ Automatic data backup
- ✅ Scalable cloud storage
- ✅ Multi-device access
- ✅ Data persistence across sessions
- ✅ Error handling and offline support

## Important Notes:
1. Replace the demo Firebase config with your actual project config
2. The app uses Firebase Realtime Database instead of localStorage
3. All data is now stored in the cloud and synchronized in real-time
4. Make sure to configure proper security rules for production use
