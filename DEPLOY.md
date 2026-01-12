# 🚀 Deployment Guide: Yarey Agent

Follow these steps to deploy your Next.js application to Firebase Hosting.

## Prerequisites
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase Project created in the [Firebase Console](https://console.firebase.google.com/)
- **Blaze Plan (Pay-as-you-go)** enabled (Required for Next.js SSR/Image Optimization).

## Deployment Steps

1. **Login**
   ```bash
   firebase login
   ```

2. **Enable Web Frameworks**
   (Ensures Next.js is auto-detected and built correctly)
   ```bash
   firebase experiments:enable webframeworks
   ```

3. **Initialize**
   ```bash
   firebase init hosting
   ```
   - **Project:** Select your project.
   - **Detected Next.js:** Select **Yes**.
   - **Region:** Choose `asia-southeast1` (Singapore) if available.

4. **Deploy**
   ```bash
   firebase deploy
   ```

## Troubleshooting
- If build fails, run `npm run build` locally to see errors.
- If "Billing Account" error, upgrade project to **Blaze** plan in Firebase Console.
- Commit the generated `.firebaserc` and `firebase.json` files after initialization.
