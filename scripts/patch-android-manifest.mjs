import { readFile, writeFile } from 'node:fs/promises';
const path = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(path, 'utf8');
const additions = [
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />'
];
for (const line of additions) {
  const name = line.match(/android:name="([^"]+)/)?.[1];
  if (name && !xml.includes(`android:name="${name}"`)) {
    const at = xml.indexOf('<application');
    if (at < 0) throw new Error('AndroidManifest.xml has no <application> tag');
    xml = xml.slice(0, at) + line + '\n    ' + xml.slice(at);
  }
}
await writeFile(path, xml);
console.log('Bluetooth and microphone permissions added');

// Register the existing Thrive auth callback URI for email confirmation/recovery links.
const activity = xml.match(/<activity\b[\s\S]*?android:name="[^"]*(?:MainActivity|\.MainActivity)"[\s\S]*?>/);
if (activity && !xml.includes('android:scheme="thrive"')) {
  const tag = activity[0];
  const filter = `\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="thrive" android:host="auth" />\n            </intent-filter>`;
  xml = xml.replace(tag, tag + filter);
}
