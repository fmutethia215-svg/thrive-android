# Thrive v11.5 change log

## Implemented in this package
- Redesigned Notes/Journal editing layout: persistent notes list on desktop, All notes control beside the title, shorter/wider toolbar, autosave status directly beneath the toolbar, centered document surface, and responsive mobile layout. Theme variables remain respected.
- Kept rich text editing, title editing, category selection, pin/delete, Word export, dictation, AI writing tools and autosave.
- Added Health section exports for JSON and CSV.
- Improved health file import parsing for CSV/JSON plus GPX/TCX activity files, with clear errors for invalid or unrecognized data.
- Added Growth Lab with project builder, Knowledge Vault, Conversation Gym, missions, skill-practice log and weekly review. These records are stored in the existing Thrive user payload so the existing cloud-save mechanism can sync them.
- Android page now imports `src/native-bridge.js`, which is required for the Capacitor BLE bridge code to run.
- Bumped the PWA service-worker cache key so updated assets can replace the previous cached shell.
- Added a preflight check to the Android GitHub Actions workflow and clarified the default-branch requirement in the README.

## Limitations that remain
- Oraimo Health's private historical records cannot be read directly by this app without an Oraimo-supported API/SDK or a file export from Oraimo Health. The import accepts compatible files only; it does not bypass vendor app restrictions.
- Standard BLE pairing can access only services exposed by the particular watch. The native bridge is wired into the Android build, but physical pairing and heart-rate streaming still require testing with the actual Oraimo watch model.
- Cloud synchronization requires the configured Supabase project to be reachable and its `user_data` table/RLS policies to be correctly configured. This environment did not complete a live account sync test.
