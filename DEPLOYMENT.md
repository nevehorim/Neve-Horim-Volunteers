# Deployment Guide

This guide will walk you through deploying the Volunteer Management System to Firebase Hosting.

## Prerequisites

1. **Node.js** (v18 or higher) and **npm** (v8 or higher)
2. **Firebase account** - Sign up at [Firebase Console](https://console.firebase.google.com/)
3. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```

## Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing: `volunteer-management-system-jr`)
3. Enable the following services:
   - **Firestore Database**: 
     - Go to Firestore Database → Create database
     - Start in **production mode** (or test mode for development)
     - Choose your preferred location
   - **Authentication**:
     - Go to Authentication → Get started
     - Enable **Email/Password** sign-in method
   - **Storage** (if needed):
     - Go to Storage → Get started
     - Start in production mode

## Step 2: Configure Environment Variables

1. In Firebase Console, go to **Project Settings** → **Your apps** → **Web app**
2. Copy your Firebase configuration values

3. Create a `.env` file in the project root:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Important**: Add `.env` to `.gitignore` if not already there (never commit secrets!)

## Step 3: Update Firebase Project Configuration

If you're using a different Firebase project, update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

## Step 4: Login to Firebase CLI

```bash
firebase login
```

This will open your browser to authenticate with your Google account.

## Step 5: Initialize Firebase Hosting (if not already done)

```bash
firebase init hosting
```

When prompted:
- Select your Firebase project
- Public directory: `dist` (this is where Vite builds)
- Configure as single-page app: **Yes**
- Set up automatic builds and deploys: **No** (we'll deploy manually)

## Step 6: Build the Application

Build the production-ready version:

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## Step 7: Test the Build Locally (Optional)

Before deploying, test the production build:

```bash
npm run preview
```

Visit `http://localhost:4173` (or the port shown) to verify everything works.

## Step 8: Deploy to Firebase Hosting

Deploy your application:

```bash
firebase deploy --only hosting
```

This will:
- Upload the `dist` folder to Firebase Hosting
- Provide you with a hosting URL (e.g., `https://your-project.web.app`)

## Step 9: Verify Deployment

1. Visit your deployed URL
2. Test the login functionality
3. Verify all features work correctly
4. Check that environment variables are properly loaded

## Continuous Deployment (Optional)

### Option 1: GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-firebase-project-id
```

### Option 2: Firebase Hosting GitHub Integration

1. Go to Firebase Console → Hosting
2. Click "Connect GitHub repository"
3. Follow the setup wizard
4. Configure automatic deployments

## Firestore Security Rules

Before going to production, set up proper Firestore security rules:

1. Go to Firestore Database → Rules
2. Configure rules based on your authentication requirements
3. Example basic rules (customize for your needs):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add more rules for volunteers, residents, appointments, etc.
    // This is just a basic example - customize based on your needs
  }
}
```

## Storage Security Rules

If using Firebase Storage, configure security rules:

1. Go to Storage → Rules
2. Example rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      // Customize based on your needs
    }
  }
}
```

## Troubleshooting

### Build Errors
- Ensure all environment variables are set
- Check that all dependencies are installed: `npm install`
- Verify Node.js version: `node --version` (should be v18+)

### Deployment Errors
- Verify Firebase CLI is logged in: `firebase login`
- Check project ID matches: `firebase projects:list`
- Ensure `dist` folder exists after build

### Runtime Errors
- Check browser console for errors
- Verify Firebase configuration in `.env`
- Ensure Firestore and Authentication are enabled
- Check Firestore security rules allow your operations

### Environment Variables Not Working
- Vite requires `VITE_` prefix for environment variables
- Rebuild after changing `.env`: `npm run build`
- Check that variables are accessible: `console.log(import.meta.env)`

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## Quick Deploy Commands

```bash
# Full deployment workflow
npm run build && firebase deploy --only hosting

# Deploy with specific project
firebase deploy --only hosting --project your-project-id

# Preview before deploying
npm run build && npm run preview
```

