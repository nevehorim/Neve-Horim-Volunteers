# Database Access Guide

This guide explains how to access the Firestore database for the Volunteer Management System.

## ⚠️ Important: Enable Firestore First!

**If you don't see "Firestore Database" in the Firebase Console**, you need to enable it first. See `ENABLE_FIRESTORE.md` for step-by-step instructions.

## Method 1: Firebase Console (Web UI) - Recommended

The easiest way to view and manage your database is through the Firebase Console web interface.

### Steps:

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Select Your Project**
   - Choose the project: `volunteer-management-system-jr` (or your project name)

3. **Navigate to Firestore Database**
   - In the left sidebar, under **"Build"**, click on **"Firestore Database"**
   - If you don't see it, you need to enable it first (see `ENABLE_FIRESTORE.md`)
   - You'll see all your collections and documents

### Available Collections:

Based on the codebase, your database contains these collections:

- **`users`** - User accounts and authentication data
- **`volunteers`** - Volunteer profiles and information
- **`residents`** - Resident profiles and preferences
- **`calendar_slots`** - Session scheduling and management
- **`appointments`** - Appointment records
- **`attendance`** - Attendance tracking
- **`matching_rules`** - AI matching algorithm configuration
- **`reports`** - Generated reports
- **`external_groups`** - External group visit management

### Features in Firebase Console:

- **View Data**: Browse collections and documents
- **Edit Data**: Click on documents to edit fields
- **Add Documents**: Create new documents manually
- **Delete Data**: Remove documents or entire collections
- **Query Data**: Use the query builder to filter data
- **Export Data**: Export collections to JSON/CSV
- **Import Data**: Import data from JSON files

## Method 2: Firebase CLI

Access the database from the command line using Firebase CLI.

### Prerequisites:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### View Collections:

```bash
# List all collections (requires Firebase Admin SDK setup)
# Note: Direct Firestore access via CLI is limited
```

### Export Data:

```bash
# Export all Firestore data
firebase firestore:export gs://your-bucket/backup

# Or export to local file (requires gcloud CLI)
gcloud firestore export gs://your-bucket/backup
```

## Method 3: Programmatic Access (Node.js Script)

Create a script to access the database programmatically.

### Create a Database Access Script:

Create `scripts/view-database.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function viewCollection(collectionName) {
  console.log(`\n=== ${collectionName.toUpperCase()} ===`);
  const querySnapshot = await getDocs(collection(db, collectionName));
  
  if (querySnapshot.empty) {
    console.log('No documents found.');
    return;
  }
  
  querySnapshot.forEach((doc) => {
    console.log(`\nDocument ID: ${doc.id}`);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
  });
}

async function viewAllCollections() {
  const collections = [
    'users',
    'volunteers',
    'residents',
    'calendar_slots',
    'appointments',
    'attendance',
    'matching_rules',
    'reports',
    'external_groups'
  ];
  
  for (const collectionName of collections) {
    await viewCollection(collectionName);
  }
}

// Run the script
viewAllCollections()
  .then(() => {
    console.log('\n✅ Database view complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
```

### Run the Script:

```bash
node scripts/view-database.js
```

## Method 4: Firebase Admin SDK (Server-Side)

For more advanced operations, use the Firebase Admin SDK.

### Setup:

1. **Get Service Account Key**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely (add to `.gitignore`!)

2. **Install Admin SDK**:
   ```bash
   npm install firebase-admin
   ```

3. **Create Admin Script** (`scripts/admin-db-access.js`):

```javascript
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listCollections() {
  const collections = await db.listCollections();
  console.log('Available collections:');
  collections.forEach(collection => {
    console.log(`- ${collection.id}`);
  });
}

async function getCollectionData(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  console.log(`\n=== ${collectionName} (${snapshot.size} documents) ===`);
  
  snapshot.forEach(doc => {
    console.log(`\nDocument ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

// Usage
const collectionName = process.argv[2] || 'users';
getCollectionData(collectionName);
```

### Run:

```bash
node scripts/admin-db-access.js users
node scripts/admin-db-access.js volunteers
```

## Method 5: Browser DevTools (In-App)

You can also access database data through the browser console when using the app.

1. **Open the deployed app** in your browser
2. **Open Developer Tools** (F12 or Cmd+Option+I)
3. **Go to Console tab**
4. The app uses real-time listeners, so you can inspect the data:

```javascript
// In browser console (when logged in as manager)
// The app uses React hooks that log data - check the console
// Or you can access Firebase directly:

import { db } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Get all users
const usersSnapshot = await getDocs(collection(db, 'users'));
usersSnapshot.forEach(doc => console.log(doc.data()));
```

## Quick Reference: Database Structure

### Users Collection
```typescript
{
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: 'manager' | 'volunteer';
  isActive: boolean;
  createdAt: Timestamp;
}
```

### Volunteers Collection
```typescript
{
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  skills?: string[];
  hobbies?: string[];
  languages: string[];
  availability?: { [dayOfWeek: string]: string[] };
  // ... more fields
}
```

### Residents Collection
```typescript
{
  id: string;
  fullName: string;
  birthDate: string;
  gender: 'male' | 'female';
  languages: string[];
  needs?: string[];
  hobbies?: string[];
  availability: { [dayOfWeek: string]: string[] };
  // ... more fields
}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit service account keys** to version control
2. **Use environment variables** for sensitive data
3. **Set up Firestore Security Rules** to protect your data
4. **Limit Admin SDK usage** to server-side only
5. **Review access logs** regularly in Firebase Console

## Troubleshooting

### Can't see data in Firebase Console?
- Check that you're logged into the correct Google account
- Verify you have access to the project
- Ensure Firestore is enabled in your project

### Permission denied errors?
- Check Firestore Security Rules
- Verify your authentication status
- Ensure you're using the correct project ID

### Connection issues?
- Check your internet connection
- Verify Firebase configuration in `.env`
- Check Firebase project status in console

## Useful Firebase Console URLs

- **Firestore Database**: `https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore`
- **Authentication**: `https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication`
- **Project Settings**: `https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings`

Replace `YOUR_PROJECT_ID` with your actual project ID (e.g., `volunteer-management-system-jr`).

