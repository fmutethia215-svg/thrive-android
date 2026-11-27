import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = () => Capacitor.isNativePlatform();
const HR_SERVICE = numberToUUID(0x180d);
const HR_MEASUREMENT = numberToUUID(0x2a37);
const BATTERY_SERVICE = numberToUUID(0x180f);
const BATTERY_LEVEL = numberToUUID(0x2a19);
const DEVICE_INFO_SERVICE = numberToUUID(0x180a);
let connected = null;
let hrActive = false;
let batteryLevel = null;
let disconnecting = false;

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
function parseHeartRate(value) {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const bpm = flags & 1 ? (value.byteLength >= 3 ? value.getUint16(1, true) : NaN) : value.getUint8(1);
  return Number.isFinite(bpm) && bpm >= 25 && bpm <= 240 ? bpm : null;
}

window.ThriveNativeSave = async (name, mime, content) => {
  if (!isNative()) throw new Error('Native file sharing is available only in the installed Android app.');
  const safeName = String(name || 'thrive-export.txt').replace(/[\\/:*?\"<>|]/g, '_');
  const saved = await Filesystem.writeFile({ path: safeName, data: String(content ?? ''), directory: Directory.Cache, recursive: true, encoding: 'utf8' });
  await Share.share({ title: safeName, text: safeName, url: saved.uri, dialogTitle: 'Save or share Thrive file' });
  return true;
};

window.ThriveNativeBLE = {
  async pair(mode = 'all') {
    await BleClient.initialize({ androidNeverForLocation: true });
    const options = mode === 'hr'
      ? { services: [HR_SERVICE], optionalServices: [BATTERY_SERVICE, DEVICE_INFO_SERVICE] }
      : { acceptAllDevices: true, optionalServices: [HR_SERVICE, BATTERY_SERVICE, DEVICE_INFO_SERVICE] };
    const device = await BleClient.requestDevice(options);
    if (connected?.deviceId) {
      try { await this.disconnect(); } catch (_) {}
    }
    await BleClient.connect(device.deviceId, () => {
      connected = null;
      hrActive = false;
      emit('thrive-native-ble-disconnected');
    });
    connected = device;
    batteryLevel = null;
    try {
      const b = await BleClient.read(device.deviceId, BATTERY_SERVICE, BATTERY_LEVEL);
      batteryLevel = b.getUint8(0);
    } catch (_) { /* Device may not expose standard battery data. */ }
    let hr = false;
    try {
      await BleClient.startNotifications(device.deviceId, HR_SERVICE, HR_MEASUREMENT, value => {
        try {
          const bpm = parseHeartRate(value);
          if (bpm !== null) emit('thrive-native-heart-rate', { bpm, device: device.name || 'Bluetooth LE device' });
        } catch (_) { /* Ignore malformed packets, keep connection alive. */ }
      });
      hrActive = true;
      hr = true;
    } catch (_) { /* Pairing can succeed without standard heart-rate service. */ }
    const result = { name: device.name || 'Bluetooth LE device', hr, battery: batteryLevel };
    emit('thrive-native-watch-connected', result);
    return result;
  },
  async disconnect() {
    if (!connected?.deviceId) return;
    const id = connected.deviceId;
    disconnecting = true;
    try {
      if (hrActive) await BleClient.stopNotifications(id, HR_SERVICE, HR_MEASUREMENT);
    } catch (_) {}
    try { await BleClient.disconnect(id); }
    finally {
      connected = null;
      hrActive = false;
      disconnecting = false;
      emit('thrive-native-ble-disconnected');
    }
  },
  status() { return { connected: !!connected, name: connected?.name || '', battery: batteryLevel, heartRateNotifications: hrActive }; }
};

// Use the Android system Back button to navigate within Thrive first.
// On the dashboard, return the app to the background instead of unexpectedly exiting.
if (isNative()) {
  // This is already an installed app: hide PWA/browser-install prompts in Settings.
  const hideWebInstallHints = () => {
    document.querySelectorAll('#instbtn').forEach(button => {
      const next = button.nextElementSibling;
      button.remove();
      if (next && /Add to Home Screen|browser.s Install option|Install Thrive as an app/i.test(next.textContent || '')) next.remove();
    });
  };
  hideWebInstallHints();
  new MutationObserver(hideWebInstallHints).observe(document.body, { childList: true, subtree: true });

  App.addListener('backButton', async () => {
    const dialog = document.querySelector('#hwpop');
    if (dialog) { dialog.remove(); return; }
    const ai = document.querySelector('#aip');
    if (ai && !ai.classList.contains('hidden')) { try { window.aiToggle?.(); } catch (_) { ai.classList.add('hidden'); } return; }
    const noteEditor = document.body.classList.contains('nb-open');
    if (noteEditor && window.v102?.closeNote) { window.v102.closeNote(); return; }
    const active = document.querySelector('#nav button.active')?.dataset.page || 'dashboard';
    if (active !== 'dashboard' && typeof window.go === 'function') { window.go('dashboard'); return; }
    try { await App.minimizeApp(); } catch (_) { try { await App.exitApp(); } catch (_) {} }
  });

  // Replace web Bluetooth click handling only in the installed native app.
  document.addEventListener('click', async event => {
    const button = event.target.closest('#v9-bt,[data-v102-hr]');
    if (!button || !isNative()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const mode = button.matches('[data-v102-hr]') ? 'hr' : 'all';
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Searching…';
    try {
      const result = await window.ThriveNativeBLE.pair(mode);
      button.textContent = result.hr ? '✓ Watch connected' : '✓ Device connected';
      if (!result.hr) {
        const note = document.querySelector('#v9-bt')?.parentElement;
        if (note && !note.querySelector('[data-native-watch-note]')) {
          note.insertAdjacentHTML('afterend', '<p data-native-watch-note class="muted small">Connected, but this device did not expose the standard live heart-rate service. Steps, sleep and other data require supported watch services or a vendor export.</p>');
        }
      }
    } catch (error) {
      button.textContent = old;
      const message = error?.name === 'NotFoundError' || error?.name === 'AbortError'
        ? 'No Bluetooth device selected.'
        : 'Bluetooth pairing failed: ' + (error?.message || 'Check Bluetooth permission and try again.');
      if (typeof window.msg === 'function') window.msg(message); else console.warn(message, error);
    } finally { button.disabled = false; }
  }, true);
}
