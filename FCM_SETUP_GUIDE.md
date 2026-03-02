# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for real-time push notifications in the Travion app.

## 🚀 Overview

Push notifications are now implemented to alert users in real-time when incidents are reported nearby. When User A reports a theft in Pettah, User B (who is also in Pettah) will receive an **instant push notification** on their phone.

## 📋 Prerequisites

- Google Account
- Firebase Project (or create a new one)
- Android Studio (for Android testing)
- Xcode (for iOS testing, Mac only)

## 🔧 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select existing project
3. Enter project name: `travion-app` (or your choice)
4. Enable Google Analytics (optional)
5. Create project

## 📱 Step 2: Add Android App to Firebase

### 2.1 Register Android App

1. In Firebase Console, click "Add app" > Android icon
2. Enter package name: Check `android/app/build.gradle` for `applicationId`
   - Example: `com.travionmobile`
3. App nickname: `Travion Android` (optional)
4. Debug signing certificate SHA-1 (optional for testing)
5. Click "Register app"

### 2.2 Download google-services.json

1. Download `google-services.json` file
2. Place it in: `travion-mobile/android/app/google-services.json`

### 2.3 Update Android Configuration

**android/build.gradle** (Project level):

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**android/app/build.gradle** (App level):

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // Add this line

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
    implementation 'com.google.firebase:firebase-analytics:21.5.0'
}
```

**android/app/src/main/AndroidManifest.xml**:

```xml
<manifest ...>
    <!-- Add permissions -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.INTERNET" />

    <application ...>
        <!-- Add FCM service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.messaging.FIREBASE_MESSAGING_SERVICE" />
            </intent-filter>
        </service>

        <!-- Notification channel for Android 8.0+ -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="incident_alerts" />
    </application>
</manifest>
```

## 🍎 Step 3: Add iOS App to Firebase (Optional)

### 3.1 Register iOS App

1. In Firebase Console, click "Add app" > iOS icon
2. Enter bundle ID: Check `ios/Podfile` or Xcode project
   - Example: `com.travionmobile`
3. Download `GoogleService-Info.plist`
4. Add file to Xcode project: `ios/travionmobile/GoogleService-Info.plist`

### 3.2 Update iOS Configuration

**ios/Podfile**:

```ruby
target 'travionmobile' do
  use_frameworks!

  # Add Firebase pods
  pod 'Firebase/Messaging'
  pod 'Firebase/Analytics'
end
```

Run: `cd ios && pod install`

**Enable Push Notifications Capability** in Xcode:

1. Open `.xcworkspace` file in Xcode
2. Select your project target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" > Enable "Remote notifications"

## 🔑 Step 4: Get Firebase Service Account (Backend)

### 4.1 Generate Private Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download JSON file (e.g., `firebase-service-account.json`)

### 4.2 Set Environment Variables

Add to `travion-backend/.env`:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

**OR** place the service account file:

```
travion-backend/config/firebase-service-account.json
```

And uncomment this line in `PushNotificationService.ts`:

```typescript
admin.initializeApp({
  credential: admin.credential.cert(require('../../config/firebase-service-account.json')),
});
```

## 🔨 Step 5: Install Dependencies

### Mobile App

```bash
cd travion-mobile
npm install
```

### Backend

```bash
cd travion-backend
npm install
```

## 📲 Step 6: Build and Test

### Android

```bash
cd travion-mobile
npx react-native run-android
```

### iOS

```bash
cd travion-mobile
npx react-native run-ios
```

## 🧪 Testing Push Notifications

### Test Scenario:

1. **User A** (Reporter):

   - Open app and login
   - Go to "Report Incident"
   - Report a theft in Pettah
   - Submit report

2. **User B** (Nearby):
   - Open app separately (different device/simulator)
   - Grant location permission (must be near Pettah)
   - App runs in background or foreground
   - **Receives notification instantly**: "🚨 Theft Alert Nearby"
   - Tap notification → Opens app → Shows Alerts screen
   - See User A's report with location, time, distance

### Test Firebase Manually (Optional)

Firebase Console > Cloud Messaging > Send Test Message:

```json
{
  "notification": {
    "title": "Test Alert",
    "body": "This is a test notification"
  },
  "data": {
    "type": "incident_alert",
    "screen": "Alerts"
  }
}
```

## 🔧 Troubleshooting

### Issue: "No FCM token received"

**Solution:**

- Check `google-services.json` is in correct location
- Rebuild app: `cd android && ./gradlew clean && cd .. && npx react-native run-android`
- Check Firebase Console > Cloud Messaging is enabled

### Issue: "Notifications not received"

**Solution:**

- Verify app has notification permissions
- Check device token is registered in database (check logs)
- Ensure backend Firebase credentials are correct
- Test with Firebase Console test message

### Issue: "Invalid credentials" on backend

**Solution:**

- Verify `.env` file has correct Firebase credentials
- Ensure private key format is correct (include `\n` characters)
- Check service account has "Firebase Cloud Messaging API Admin" role

## 📊 Database Setup

The DeviceToken model will automatically create indexes when the server starts. Verify in MongoDB:

```bash
db.devicetokens.getIndexes()
```

Should show:

- `{ location: "2dsphere" }` - For geospatial queries
- `{ userId: 1 }`
- `{ isActive: 1, lastActiveAt: -1 }`

## 🎯 How It Works

```
┌────────────────────────────────────────────────┐
│  User A Reports Incident                       │
│  POST /api/v1/incidents/report                 │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  Backend: IncidentReportService                │
│  1. Save incident to DB                        │
│  2. Find nearby devices (5km radius)           │
│  3. Send FCM to device tokens                  │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  Google FCM Servers                            │
│  Route notifications to devices                │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  User B's Device                               │
│  1. Receives notification                      │
│  2. Shows in notification tray                 │
│  3. Tap → Opens app → Alerts screen            │
└────────────────────────────────────────────────┘
```

## 🔒 Security Notes

- **Never commit** `google-services.json` or `firebase-service-account.json` to Git
- Add to `.gitignore`:
  ```
  # Firebase
  android/app/google-services.json
  ios/GoogleService-Info.plist
  config/firebase-service-account.json
  ```
- Use environment variables for production
- Rotate service account keys periodically
- Limit service account permissions

## 📝 API Endpoints

### Register Device Token

```http
POST /api/v1/push-notifications/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "fcm_token_here",
  "platform": "android",
  "location": {
    "latitude": 6.9271,
    "longitude": 79.8612
  }
}
```

### Update Location

```http
PUT /api/v1/push-notifications/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 6.9271,
  "longitude": 79.8612
}
```

### Unregister Token

```http
DELETE /api/v1/push-notifications/unregister
Authorization: Bearer <token>
```

## 🎉 Success Checklist

- [ ] Firebase project created
- [ ] `google-services.json` added to Android app
- [ ] Android dependencies configured
- [ ] Backend Firebase credentials set
- [ ] App builds successfully
- [ ] Notification permission requested
- [ ] FCM token generated and logged
- [ ] Token registered in backend database
- [ ] Test incident report created
- [ ] Push notification received on nearby device
- [ ] Notification opens app and shows alert

## 📞 Need Help?

- Firebase Docs: https://firebase.google.com/docs/cloud-messaging
- React Native Firebase: https://rnfirebase.io/
- Check logs: `adb logcat` (Android) or Xcode console (iOS)

---

**Status**: ✅ Implementation Complete - Ready for Firebase Configuration
