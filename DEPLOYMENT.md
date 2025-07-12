
# GitHub Pages Deployment Guide

## Prerequisites

1. **Firebase Project Setup**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (e.g., "ezsociety-yourname")
   - Enable Realtime Database
   - Copy your Firebase configuration

2. **Update Firebase Configuration**
   - Replace the values in `script.js` with your actual Firebase config
   - Make sure to use your actual project credentials

## Deployment Steps

### 1. Prepare Repository
```bash
git add .
git commit -m "Prepare for GitHub Pages deployment"
git push origin main
```

### 2. Enable GitHub Pages
1. Go to your repository settings
2. Navigate to "Pages" section
3. Source: "Deploy from a branch"
4. Branch: "gh-pages"
5. Folder: "/ (root)"

### 3. Automatic Deployment
- The GitHub Actions workflow will automatically build and deploy your app
- Every push to the main branch triggers a new deployment
- Check the "Actions" tab to monitor deployment progress

### 4. Access Your App
- Your app will be available at: `https://yourusername.github.io/repository-name`

## Firebase Security Rules

For production, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note:** These are open rules for demo purposes. For production, implement proper authentication and authorization.

## Environment Variables (Optional)

For enhanced security, you can use GitHub Secrets:

1. Go to Repository Settings > Secrets and variables > Actions
2. Add your Firebase config as secrets
3. Update the workflow to use these secrets during build

## Troubleshooting

- **App not loading**: Check if the base URL in `vite.config.js` is correct
- **Firebase errors**: Verify your Firebase configuration is correct
- **PWA not installing**: Check if HTTPS is enabled (GitHub Pages provides HTTPS automatically)
- **Service Worker issues**: Clear browser cache and check Console for errors

## Manual Build (Alternative)

If you prefer manual deployment:

```bash
npm install
npm run build
```

Then upload the `dist` folder contents to your hosting provider.
