# Testing Push Notifications with Multiple Devices

## Quick Setup: Two Emulators Testing

### Step 1: Build Release APK

```bash
cd travion-mobile
cd android
./gradlew assembleDebug
cd ..
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 2: Start Two Emulators

```bash
# List available emulators
emulator -list-avds

# Start first emulator
emulator -avd Pixel_5_API_31 &

# Start second emulator
emulator -avd Pixel_6_API_33 &
```

### Step 3: List Connected Devices

```bash
adb devices
```

Output example:

```
List of devices attached
emulator-5554   device
emulator-5556   device
```

### Step 4: Install APK on Both Emulators

```bash
# Install on first emulator (User A)
adb -s emulator-5554 install android/app/build/outputs/apk/debug/app-debug.apk

# Install on second emulator (User B)
adb -s emulator-5556 install android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 5: Start Metro Bundler

```bash
npx react-native start
```

### Step 6: Configure Port Forwarding for Both Devices

```bash
# Forward port 8081 to first emulator
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Forward port 8081 to second emulator
adb -s emulator-5556 reverse tcp:8081 tcp:8081
```

### Step 7: Test Push Notifications

**On Emulator 1 (User A - Reporter):**

1. Open app
2. Login as User A
3. Grant location permission (set location in emulator to Colombo)
4. Go to "Report Incident"
5. Report a theft
6. Submit

**On Emulator 2 (User B - Receiver):**

1. Open app
2. Login as User B (different account)
3. Grant location permission (set location near User A's report location)
4. Keep app open or in background
5. **Should receive push notification instantly!**

## Alternative: One Emulator + One Physical Device

This is the **easiest method**:

### Physical Device Setup:

1. Enable **Developer Options** on your Android phone
   - Settings > About Phone > Tap "Build Number" 7 times
2. Enable **USB Debugging**
   - Settings > Developer Options > USB Debugging
3. Connect phone via USB cable
4. Allow USB debugging when prompted on phone

### Run on Both:

```bash
# Start Metro bundler
npx react-native start

# In another terminal, run app (will install on all connected devices)
npx react-native run-android
```

Or install selectively:

```bash
# Check devices
adb devices

# Install on emulator only
adb -s emulator-5554 install android/app/build/outputs/apk/debug/app-debug.apk

# Install on physical device
adb -s <device-id> install android/app/build/outputs/apk/debug/app-debug.apk
```

## Set Emulator Location (Important!)

To test proximity-based notifications, set emulator locations:

### Option 1: Via Emulator Extended Controls

1. Click "..." (More) button in emulator toolbar
2. Go to "Location"
3. Enter coordinates:
   - **Pettah, Colombo**: Latitude: `6.9344`, Longitude: `79.8508`
   - **Near Pettah**: Latitude: `6.9370`, Longitude: `79.8520`
4. Click "Send"

### Option 2: Via ADB Command

```bash
# Set location for emulator 1
adb -s emulator-5554 emu geo fix 79.8508 6.9344

# Set location for emulator 2 (nearby)
adb -s emulator-5556 emu geo fix 79.8520 6.9370
```

## View Logs

Monitor logs to see FCM tokens and notification delivery:

```bash
# View logs for specific emulator
adb -s emulator-5554 logcat | grep -i firebase

# Or view all logs
adb -s emulator-5554 logcat *:E
```

Look for:

- ✅ `FCM Token: ey...` (indicates FCM initialized)
- ✅ `Device token registered successfully`
- ✅ `Notification received`

## Troubleshooting

### Issue: "Debugger connection attempted for unregistered device"

**Solution**: This happens when Metro bundler is confused about which device to connect to.

1. Stop Metro bundler (Ctrl+C)
2. Clear Metro cache:
   ```bash
   rm -rf node_modules/.cache
   npx react-native start --reset-cache
   ```
3. Configure port forwarding for each device separately

### Issue: "APK not found"

**Solution**: Build the APK first:

```bash
cd android
./gradlew assembleDebug
```

### Issue: Not receiving notifications

**Checklist**:

- [ ] Both devices have different user accounts logged in
- [ ] Both devices granted location permissions
- [ ] Both devices have location set (not 0,0)
- [ ] Devices are within 5km of each other
- [ ] Backend server is running
- [ ] Firebase credentials configured in backend `.env`
- [ ] `google-services.json` is in correct location
- [ ] App was rebuilt after adding Firebase

## Quick Test Commands

```bash
# Kill all emulators and start fresh
adb devices | grep emulator | cut -f1 | xargs -I {} adb -s {} emu kill

# Uninstall app from all devices
adb devices | grep device | awk '{print $1}' | xargs -I {} adb -s {} uninstall com.travionmobile

# Install debug APK on all devices
adb devices | grep device | awk '{print $1}' | xargs -I {} adb -s {} install android/app/build/outputs/apk/debug/app-debug.apk

# Check if FCM is working (look for FCM token in logs)
adb logcat | grep -i "fcm\|firebase\|notification"
```

## Production Testing

For production testing, build a release APK:

```bash
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

Sign it and distribute for testing on real devices.

---

**Recommended Setup**: Use **1 emulator + 1 physical device** for easiest testing!
