# Thrive v11.5 — Android APK build kit

This is a separate Android build project. It uses the same Thrive v11.3 interface as the website ZIP, but adds a Capacitor Android shell, native Android Back navigation, Bluetooth Low Energy support, and mobile-safe app behaviour. It is an installable Android app, not a browser shortcut.

## GitHub Actions workflow — INCLUDED

The workflow is already included at:

`.github/workflows/build-android.yml`

The Android manifest patch script is also included at:

`scripts/patch-android-manifest.mjs`

### Build the APK

1. Create a separate GitHub repository, for example `thrive-android`.
2. Upload the **extracted contents** of this ZIP to the repository root. Do not upload the ZIP itself.
3. Keep `.github/workflows/build-android.yml` and `scripts/patch-android-manifest.mjs` in those exact folders.
4. Commit everything to `main`.
5. Open **Actions → Build Thrive Android APK**.
6. You can also trigger it manually with **Run workflow** because the workflow contains `workflow_dispatch`.
7. When the run is green, open the run's **Summary** and download the artifact named `Thrive-Android-APK`.
8. The artifact contains `app-debug.apk`.

The workflow installs Node 22, Java 21, dependencies, builds the web assets, creates the Android project, patches Bluetooth/microphone permissions, syncs Capacitor, builds the debug APK, and uploads the APK artifact.

## Supabase cloud accounts

The provided Thrive Project URL and publishable key are embedded in `index.html`. The client uses a Supabase **publishable** key, not a secret/service-role key. Supabase documents publishable keys as the appropriate key for browser and mobile client code; secret keys must remain server-side. urlSupabase API key documentationhttps://supabase.com/docs/guides/getting-started/api-keys

1. In the Supabase project, run `supabase_setup.sql` in SQL Editor.
2. Confirm the `user_data` table has owner-only RLS policies.
3. Enable email confirmation in Authentication.
4. Allow `https://fmutethia215-svg.github.io/thrive/` in Authentication URL Configuration.
5. Create an account, confirm its email, and log in.
6. Test a journal/task change and verify the sync indicator reports the cloud save.
7. Sign in on another device and verify the same account data appears.

Cloud saves now queue very quickly after changes and retain a local cache as a safety copy. Real cross-device sync still requires the Supabase project to be reachable and its SQL/RLS configuration to be correct.

## Journal changes in v11.3

- The writing page and formatting toolbar are one editing surface on mobile/tablet/web.
- The formatting toolbar stays attached to the writing area while the editor surface scrolls.
- Removed Journal Mood.
- Removed the Faith, Ideas and Gratitude notebook categories.
- Existing notes using those categories are migrated to Personal; existing mood values are removed.
- Title editing, rich text formatting, autosave, save, Word export, voice dictation, pin, delete and AI tools are retained.

## Account-password protection

- **Reset/Delete all Thrive data** now requires the signed-in account password before the final `DELETE` confirmation.
- **Change/reset Finance PIN** now requires the signed-in account password first, then the existing Finance PIN when changing an already-created PIN.
- The app never stores the account password in the Thrive data payload.

## Finance security

Finance remains protected by the 4-digit Finance PIN. Leaving Finance locks it, and the inactivity protection returns the user to Today after 10 minutes and locks Finance.

## News

The Today page keeps Google News RSS headlines as the current-news source, uses a bounded request timeout, shows a retry control, and refreshes current headlines automatically while Today is visible. AI summarisation remains optional.

## Android Back / Home / watch support

- Android Back closes open dialogs, returns from a journal note to the notes list, navigates back to Today from other sections, and minimizes from Today.
- Android Home remains controlled by Android and sends the app to the background normally.
- The native Bluetooth bridge supports standard Bluetooth Low Energy heart-rate/battery services when exposed by the device. It cannot guarantee proprietary watch data such as steps/sleep or every Oraimo model.

## QA limitations

Static JavaScript syntax checks, archive integrity, website seven-file structure, workflow presence and targeted feature checks were run. A full real-account Supabase signup/sync test requires the live Supabase project and a reachable network. A full physical Android APK build requires GitHub Actions/Android build tools. The current environment could not complete `npm install` or a headless browser session, so those are explicitly not claimed as passed.


## v11.5 fixes and verification notes

- The Android web bundle now explicitly loads `src/native-bridge.js`; without this module script the Capacitor BLE bridge would not be initialized by the page.
- The Journal/Notes editor uses a compact top formatting toolbar, keeps the autosave status directly beneath it, and retains the notes list on the left on desktop. Mobile uses a stacked layout. The user's selected theme variables remain in use.
- Health now provides separate JSON and CSV exports for Thrive's locally/cloud-saved health log and workout records.
- Oraimo Health does not have a documented public sync API included in this project. Thrive supports importing compatible CSV/JSON/GPX/TCX exports if Oraimo Health exposes a Share/Export action on the device. If that app does not offer export, direct historical data import cannot be truthfully guaranteed without a vendor-supported API/SDK. Standard BLE pairing only reads services the watch actually exposes.
- GitHub Actions only lists a manually runnable workflow after `.github/workflows/build-android.yml` is committed on the repository's default branch and Actions is enabled. Upload the extracted ZIP contents, not the ZIP file itself.

### Health import steps

1. Open Oraimo Health and look for a data export/share option for activity or health history.
2. If it produces a CSV, JSON, GPX or TCX file, save it to the phone or computer.
3. Open Thrive → Health → Import from watch app and select the file.
4. Review the imported dates and values; unsupported fields are not invented.
5. Use Export health JSON or Export health CSV in Thrive to back up the records currently stored by Thrive.

If Oraimo Health provides no export option, use manual entry for historical values and do not assume pairing alone can expose steps/sleep history.


## v11.5 fixes and verification notes

- The Android web bundle now explicitly loads `src/native-bridge.js`; without this module script the Capacitor BLE bridge would not be initialized by the page.
- The Journal/Notes editor uses a compact top formatting toolbar, keeps the autosave status directly beneath it, and retains the notes list on the left on desktop. Mobile uses a stacked layout. The user's selected theme variables remain in use.
- Health now provides separate JSON and CSV exports for Thrive's locally/cloud-saved health log and workout records.
- Oraimo Health does not have a documented public sync API included in this project. Thrive supports importing compatible CSV/JSON/GPX/TCX exports if Oraimo Health exposes a Share/Export action on the device. If that app does not offer export, direct historical data import cannot be truthfully guaranteed without a vendor-supported API/SDK. Standard BLE pairing only reads services the watch actually exposes.
- GitHub Actions only lists a manually runnable workflow after `.github/workflows/build-android.yml` is committed on the repository's default branch and Actions is enabled. Upload the extracted ZIP contents, not the ZIP file itself.

### Health import steps

1. Open Oraimo Health and look for a data export/share option for activity or health history.
2. If it produces a CSV, JSON, GPX or TCX file, save it to the phone or computer.
3. Open Thrive → Health → Import from watch app and select the file.
4. Review the imported dates and values; unsupported fields are not invented.
5. Use Export health JSON or Export health CSV in Thrive to back up the records currently stored by Thrive.

If Oraimo Health provides no export option, use manual entry for historical values and do not assume pairing alone can expose steps/sleep history.


## v11.7 reference-design notes
- The Android entry page loads `src/native-bridge.js`.
- Capacitor Filesystem and Share plugins are used for backup and journal export through the Android share/save sheet.
- `.github/workflows/build-android.yml` remains included. Run the workflow from GitHub Actions after committing the ZIP contents.
- The native build and real device/share-sheet behavior must be tested after dependency installation; JavaScript syntax checks alone do not confirm a successful APK build.
