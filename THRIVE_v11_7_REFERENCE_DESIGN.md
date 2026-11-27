# Thrive v11.7 — reference design implementation

This build applies the supplied eight design mockups to the existing Thrive codebase while retaining the existing sections and data model. The PNGs are design references, not claims that sample news, device statuses, or quality-check results are live data.

## UI changes
- **Today dashboard:** daily check-in, top priorities, attention list, seven-day progress, end-of-day review, news and weather panels. On mobile, the news card and priorities are shown first; the desktop-only glance/weather panels are hidden to match the supplied phone mockup.
- **Journal:** desktop notes list at left and editor at right; mobile full-width editor with icon-only back button; note title input; save/pin/export/delete actions in the title row on desktop; compact horizontally scrollable formatting toolbar; AI, Draw and Voice controls immediately below the toolbar; rich-text area; word/status area; search and New note. The notes-list toggle uses only the ☰ symbol. The old notebook selector is removed from the editor controls.
- **Planner:** no separate Planner navigation entry. Legacy navigation to `planner` redirects to Today. The mobile Plan tab remains, as shown in the reference mockup, and opens Today.
- **Login/account:** removes any requirement to paste cloud keys and explains local saving, cloud saving and offline behavior. The device panel reports only the current device rather than fabricating other-device timestamps.
- **Settings:** retains existing account, backup, AI and security controls and adds current-device status plus an on-demand lightweight quality check.
- **Exports:** browser downloads retain the file URL long enough for the download to begin. In the Android build, the native bridge offers a system share/save sheet for backup and journal exports.
- **Hosting:** web auth redirects use the current site origin/path rather than a hard-coded GitHub Pages URL.
- **Cache:** service-worker shell cache is bumped to v11.7.

## Android build kit
- Keeps `.github/workflows/build-android.yml` in the ZIP.
- Loads `src/native-bridge.js` from the Android app entry page.
- Includes Capacitor Filesystem and Share dependencies for native file exports.
- The existing Android hardware Back handler was not redesigned as part of this reference pass.

## Service and test caveats
- News, weather, Supabase authentication and cloud storage require working network/service configuration.
- The UI does not invent other-device presence or claim a quality check is a full end-to-end/security audit.
- AI writing requires a configured AI provider or working server-side AI function; a mock response is not substituted for a real result.
- The database setup SQL includes an optional, idempotent publication step for `user_data`. Realtime behavior still needs to be tested against the actual Supabase project and account policies.
- Bluetooth/watch support remains model- and platform-dependent; no universal Oraimo compatibility is promised.

## Validation performed
- ZIP integrity checks pass.
- All inline JavaScript blocks in the web entry page pass `node --check` syntax validation.
- The Android native bridge and manifest patch script pass `node --check` syntax validation.
- A full live-browser interaction test, Android Gradle build, and live Supabase two-device test were not completed. Before replacing the production version, test login, journal edit/save/export, AI, news/weather, mobile navigation, backup restore and cloud behavior.
