# How to Enable Firestore Database in Firebase Console

If you don't see "Firestore Database" in your Firebase Console, you need to enable it first. Follow these steps:

## Step-by-Step Instructions

### Step 1: Access Firebase Console

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Select your project: `volunteer-management-system-jr` (or your project name)

### Step 2: Enable Firestore Database

1. **Look for "Build" section** in the left sidebar
2. You should see options like:
   - Authentication
   - Firestore Database (if enabled)
   - Realtime Database
   - Storage
   - Functions
   - etc.

3. **If you don't see "Firestore Database"**, look for:
   - **"Cloud Firestore"** (older name)
   - Or click on **"Build"** → **"Firestore Database"**

4. **Click on "Firestore Database"** (or "Cloud Firestore")

5. **Click the "Create database" button**

### Step 3: Choose Database Mode

You'll be asked to choose a security mode:

#### Option A: Start in Production Mode (Recommended)
- **Select**: "Start in production mode"
- **Click**: "Next"
- You'll need to set up security rules later
- **Best for**: Production apps with proper security rules

#### Option B: Start in Test Mode (For Development)
- **Select**: "Start in test mode"
- **Click**: "Next"
- ⚠️ **Warning**: This allows read/write access for 30 days. Not secure for production!
- **Best for**: Quick testing and development

### Step 4: Choose Location

1. **Select a location** for your database:
   - Choose the region closest to your users
   - For Israel/Jerusalem, consider:
     - `europe-west1` (Belgium)
     - `europe-west3` (Frankfurt)
     - `asia-south1` (Mumbai)
   - **Note**: Location cannot be changed later!

2. **Click "Enable"**

3. Wait for Firestore to initialize (usually takes 1-2 minutes)

### Step 5: Verify Firestore is Enabled

After enabling, you should now see:
- **"Firestore Database"** in the left sidebar under "Build"
- A database interface with collections and documents
- The ability to create your first collection

## Alternative: If You See "Realtime Database" Instead

If you only see "Realtime Database" and not "Firestore Database", you might be in the wrong section:

1. **Check the left sidebar** - Look for "Build" section
2. **Firestore** and **Realtime Database** are different services:
   - **Firestore** = NoSQL document database (what this app uses)
   - **Realtime Database** = JSON database (different service)

3. Both can exist in the same project, but this app uses **Firestore**

## If You Still Don't See It

### Check Project Type
- Make sure you're using a **Blaze (pay-as-you-go)** plan or **Spark (free)** plan
- Some legacy projects might have limitations

### Check Permissions
- Ensure you have **Owner** or **Editor** permissions on the project
- If you're a viewer, you might not see all options

### Try Direct URL
Navigate directly to:
```
https://console.firebase.google.com/project/volunteer-management-system-jr/firestore
```

Replace `volunteer-management-system-jr` with your actual project ID.

## After Enabling Firestore

Once Firestore is enabled, you can:

1. **View Collections**: See all your data collections
2. **Create Collections**: Add new collections manually
3. **Add Documents**: Create documents with data
4. **Set Security Rules**: Configure who can read/write data
5. **View Data**: Browse all your app's data

## Setting Up Security Rules

After enabling Firestore, you should set up security rules. Go to:
- **Firestore Database** → **Rules** tab

Example basic rules (customize for your needs):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow managers to read/write all data
    match /{document=**} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Volunteers can read their own data
    match /volunteers/{volunteerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
  }
}
```

⚠️ **Important**: These are example rules. Customize them based on your security requirements!

## Troubleshooting

### "Create database" button doesn't appear
- Refresh the page
- Try a different browser
- Check if you have the correct permissions

### Error during creation
- Check your Firebase plan (Blaze or Spark)
- Verify you have billing enabled (even for free tier)
- Try again after a few minutes

### Still can't find it
- Check if you're in the correct Firebase project
- Verify the project ID matches your `.env` file
- Contact Firebase support if issues persist

## Quick Checklist

- [ ] Logged into Firebase Console
- [ ] Selected correct project
- [ ] Found "Build" section in sidebar
- [ ] Clicked "Firestore Database" or "Cloud Firestore"
- [ ] Clicked "Create database"
- [ ] Selected production or test mode
- [ ] Chose database location
- [ ] Clicked "Enable"
- [ ] Verified Firestore appears in sidebar
- [ ] Set up security rules

Once Firestore is enabled, you'll be able to see and manage all your database collections!

