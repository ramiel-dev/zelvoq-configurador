/** Isolated-browser fixture. Install with page.addInitScript({path: ...}). */
function installOledWebHidMock() {
  if (window.__oledHidMock) return;
  const listeners = new Map();
  const deviceListeners = new Map();
  const calls = [];
  const held = [];
  const fixture = window.__oledFixture || {};
  const identities = {corne: [0x4653,1,'Corne (Zelvoq)'], sofle:[0xfc32,0x0287,'Sofle v1'], lily58:[0x04d8,0xeb2d,'Lily58 (Zelvoq)']};
  const identity = identities[fixture.model] || [0x1209,3,'Zelvoq 60 Plus'];
  const model = {
    connected: true,
    supported: fixture.supported !== false,
    protocolVersion: fixture.protocolVersion || 2,
    enabled: true,
    storedEnabled: true,
    readbackEnabled: null,
    readbackStoredEnabled: null,
    mode: 0,
    storedMode: 0,
    delayMs: 1,
    holdNextOled: false,
    failNextOled: false,
    rejectSave: false,
    readbackMode: null,
    readbackStoredMode: null,
    rgbBrightness: 85,
    rgbEffect: 1,
    rgbSpeed: 128,
    rgbHue: 0,
    rgbSaturation: 255,
  };
  const keymap = new Uint8Array(4 * 6 * 15 * 2);
  for (let index = 1; index < keymap.length; index += 2) keymap[index] = 4;
  const encoders = new Uint8Array(4 * 2 * 2 * 2);
  const add = (registry, type, listener) => {
    if (!registry.has(type)) registry.set(type, new Set());
    registry.get(type).add(listener);
  };
  const remove = (registry, type, listener) => registry.get(type)?.delete(listener);
  const emit = (registry, type, event) => {
    for (const listener of [...(registry.get(type) ?? [])]) {
      if (typeof listener === 'function') listener(event);
      else listener?.handleEvent?.(event);
    }
  };
  const unsupported = (response) => { response[0] = 0xff; };
  const reply = (request) => {
    const response = new Uint8Array(32);
    response.set(request.subarray(0, 32));
    const command = request[0];
    const value = request[1];
    switch (command) {
      case 0x01: // VIA protocol v13, QMK 0.34.6.
        response[1] = 0; response[2] = 13; break;
      case 0x02: // Keyboard values: big-endian u32 payload after ID.
        if (value === 1 || value === 2 || value === 3 || value === 4 || value === 6) {
          response.fill(0, value === 3 ? 3 : 2); // Preserve matrix offset echo.
          if (value === 6) response[5] = 9; // QMK_KEYCODES_VERSION_BCD.
          if (value === 1) response[5] = 1;
        } else unsupported(response);
        break;
      case 0x03:
        if (value !== 2 && value !== 5) unsupported(response);
        break;
      case 0x04:
      case 0x05: {
        const offset = ((request[1] * 6 + request[2]) * 15 + request[3]) * 2;
        if (command === 0x05 && offset + 1 < keymap.length) {
          keymap[offset] = request[4]; keymap[offset + 1] = request[5];
        }
        if (command === 0x04) {
          response[4] = keymap[offset] ?? 0; response[5] = keymap[offset + 1] ?? 0;
        }
        break;
      }
      case 0x07:
      case 0x08:
      case 0x09: {
        const channel = request[1], id = request[2];
        if (channel === 0) {
          if (!model.supported) { unsupported(response); break; }
          if (command === 0x08 && id === 0x70) {
            response.set([0x5a, 0x51, model.protocolVersion, 3, model.mode, model.storedMode], 3);
            if (model.protocolVersion >= 2) {
              response[9] = Number(model.enabled);
              response[10] = Number(model.storedEnabled);
            }
          } else if (command === 0x08 && id === 0x71) {
            response[3] = model.readbackMode ?? model.mode;
            response[4] = model.readbackStoredMode ?? model.storedMode;
          } else if (command === 0x08 && id === 0x72 && model.protocolVersion >= 2) {
            response[3] = Number(model.readbackEnabled ?? model.enabled);
            response[4] = Number(model.readbackStoredEnabled ?? model.storedEnabled);
          } else if (command === 0x07 && id === 0x72 && model.protocolVersion >= 2 && request[3] <= 1) {
            model.enabled = request[3] === 1;
          } else if (command === 0x07 && id === 0x71 && request[3] < 3) {
            model.mode = request[3];
          } else if (command === 0x09) {
            if (model.rejectSave) unsupported(response);
            else {
              model.storedMode = model.mode;
              if (model.protocolVersion >= 2) model.storedEnabled = model.enabled;
            }
          } else unsupported(response);
        } else if (channel === 3 || channel === 2) { // Built-in RGB Matrix/underglow.
          if (command === 0x09) break;
          const fields = {1: 'rgbBrightness', 2: 'rgbEffect', 3: 'rgbSpeed', 4: 'rgbHue'};
          const field = fields[id];
          if (!field) { unsupported(response); break; }
          if (command === 0x08) {
            response[3] = model[field];
            if (id === 4) response[4] = model.rgbSaturation;
          } else {
            model[field] = request[3];
            if (id === 4) model.rgbSaturation = request[4];
          }
        } else unsupported(response);
        break;
      }
      case 0x0c: response[1] = 0; break; // No macro slots.
      case 0x0d: response[1] = 0; response[2] = 0; break;
      case 0x0e: response.fill(0, 4); break;
      case 0x11: response[1] = 4; break;
      case 0x12:
      case 0x13: {
        const offset = (request[1] << 8) | request[2];
        const length = Math.min(request[3], 28);
        for (let index = 0; index < length; index++) {
          if (command === 0x12) response[4 + index] = keymap[offset + index] ?? 0;
          else if (offset + index < keymap.length) keymap[offset + index] = request[4 + index];
        }
        break;
      }
      case 0x14:
      case 0x15: {
        const offset = ((request[1] * 2 + request[2]) * 2 + Number(Boolean(request[3]))) * 2;
        if (command === 0x14) {
          response[4] = encoders[offset] ?? 0; response[5] = encoders[offset + 1] ?? 0;
        } else if (offset + 1 < encoders.length) {
          encoders[offset] = request[4]; encoders[offset + 1] = request[5];
        }
        break;
      }
      default: unsupported(response); // Never pretend unknown/reset/boot worked.
    }
    return response;
  };
  const device = {
    vendorId: identity[0],
    productId: identity[1],
    productName: identity[2],
    opened: false,
    collections: [{usagePage: 0xff60, usage: 0x61, inputReports: [{reportId: 0}], outputReports: [{reportId: 0}]}],
    async open() {
      if (!model.connected) throw new DOMException('Mock device disconnected', 'NetworkError');
      device.opened = true;
    },
    async close() { device.opened = false; },
    async forget() { control.disconnect(); },
    addEventListener(type, listener) { add(deviceListeners, type, listener); },
    removeEventListener(type, listener) { remove(deviceListeners, type, listener); },
    async sendReport(reportId, data) {
      if (!model.connected) throw new DOMException('Mock device disconnected', 'NetworkError');
      if (reportId !== 0) throw new Error('Fixture expects VIA report ID 0');
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      const request = Uint8Array.from(bytes);
      calls.push(Array.from(request));
      const isOled = request[1] === 0 && [7, 8, 9].includes(request[0]);
      if (isOled && model.failNextOled) {
        model.failNextOled = false;
        throw new DOMException('Mock USB write failed', 'NetworkError');
      }
      // Compute response when the command reaches the mock device, matching USB.
      const response = reply(request);
      const deliver = () => {
        emit(deviceListeners, 'inputreport', {
          type: 'inputreport', device, reportId: 0,
          data: new DataView(response.buffer), target: device,
        });
      };
      if (isOled && model.holdNextOled) {
        model.holdNextOled = false;
        held.push(deliver);
      } else setTimeout(deliver, model.delayMs);
    },
  };
  const hid = {
    async getDevices() { return model.connected ? [device] : []; },
    async requestDevice() { return model.connected ? [device] : []; },
    addEventListener(type, listener) { add(listeners, type, listener); },
    removeEventListener(type, listener) { remove(listeners, type, listener); },
  };
  const control = {
    model, calls, device,
    clearCalls() { calls.length = 0; },
    releaseHeld() { for (const deliver of held.splice(0)) deliver(); },
    disconnect() {
      model.connected = false; device.opened = false;
      emit(listeners, 'disconnect', {device, type: 'disconnect'});
    },
    reconnect() {
      model.connected = true;
      emit(listeners, 'connect', {device, type: 'connect'});
    },
  };
  Object.defineProperty(navigator, 'hid', {configurable: true, value: hid});
  window.__oledHidMock = control;
}

// The file itself can also be passed directly to addInitScript({path}).
installOledWebHidMock();
