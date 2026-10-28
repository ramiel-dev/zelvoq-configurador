import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HID} from '../src/shims/node-hid.ts';

class FakeHidDevice extends EventTarget {
  opened = false;
  vendorId = 0x1209;
  productId = 3;
  productName = 'Zelvoq 60 Plus';
  collections = [{usagePage: 0xff60, usage: 0x61}];
  reports = new Set();
  constructor(path, opened = false) {
    super();
    this.__path = path;
    this.opened = opened;
  }
  addEventListener(type, listener, options) {
    if (type === 'inputreport') this.reports.add(listener);
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type, listener, options) {
    if (type === 'inputreport') this.reports.delete(listener);
    super.removeEventListener(type, listener, options);
  }
  async open() {
    this.opened = true;
  }
  async close() {
    this.opened = false;
  }
  input(bytes) {
    const event = new Event('inputreport');
    Object.defineProperty(event, 'data', {
      value: new DataView(Uint8Array.from(bytes).buffer),
    });
    this.dispatchEvent(event);
  }
  async sendReport(reportId, bytes) {
    assert.equal(reportId, 0);
    assert.ok(this.opened);
    const response = new Uint8Array(32);
    response.set(bytes.slice(0, 32));
    this.input(response);
  }
}

async function connect(device) {
  globalThis.self = globalThis;
  Object.defineProperty(globalThis.navigator, 'hid', {
    configurable: true,
    value: {
      async getDevices() {
        return [device];
      },
    },
  });
  const [tagged] = await HID.devices();
  const wrapper = new HID.HID(tagged.path);
  await wrapper.openPromise;
  return wrapper;
}

test('reopening the same WebHID device never duplicates a reply or shifts the next command', async () => {
  const device = new FakeHidDevice('hid-reopen');
  const wrapper = await connect(device);
  const now = Date.now;
  // Commands can occur during the same millisecond. Timestamp filtering must
  // not be relied on to conceal duplicated inputreport listeners.
  Date.now = () => 1000;
  try {
    await wrapper.write([0, 8, 0, 0x70]);
    assert.equal((await wrapper.readP())[2], 0x70);
    await device.close();
    await wrapper.write([0, 8, 0, 0x71]);
    assert.equal((await wrapper.readP())[2], 0x71);
    await wrapper.write([0, 8, 0, 0x72]);
    assert.equal(
      (await wrapper.readP())[2],
      0x72,
      'second reply was stale/duplicated',
    );
    assert.equal(
      device.reports.size,
      1,
      'one listener per physical device/path',
    );
  } finally {
    Date.now = now;
  }
});

test('an already-open authorized device receives a listener when first wrapped', async () => {
  const device = new FakeHidDevice('hid-already-open', true);
  const wrapper = await connect(device);
  assert.equal(device.reports.size, 1);
  await wrapper.write([0, 8, 0, 0x70]);
  assert.equal((await wrapper.readP())[2], 0x70);
  const another = await connect(device);
  assert.equal(device.reports.size, 1);
  await another.write([0, 8, 0, 0x72]);
  assert.equal((await another.readP())[2], 0x72);
});

test('replacement identity removes the old device listener and rejects pending old reads', async () => {
  const oldDevice = new FakeHidDevice('hid-replaced');
  const old = await connect(oldDevice);
  const pending = old.readP();
  const rejected = assert.rejects(pending, /HID device changed/);
  const device = new FakeHidDevice('hid-replaced', true);
  const current = await connect(device);
  assert.equal(oldDevice.reports.size, 0);
  assert.equal(device.reports.size, 1);
  await rejected;
  oldDevice.input([8, 0, 0x71]);
  await current.write([0, 8, 0, 0x72]);
  assert.equal((await current.readP())[2], 0x72);
});

test('replacement identity clears buffered old-device replies and keeps paths separate', async () => {
  const oldDevice = new FakeHidDevice('hid-buffered');
  await connect(oldDevice);
  oldDevice.input([8, 0, 0x71]);
  const currentDevice = new FakeHidDevice('hid-buffered', true);
  const current = await connect(currentDevice);
  const otherDevice = new FakeHidDevice('hid-other');
  const other = await connect(otherDevice);
  await current.write([0, 8, 0, 0x72]);
  await other.write([0, 8, 0, 0x70]);
  assert.equal((await current.readP())[2], 0x72);
  assert.equal((await other.readP())[2], 0x70);
});

test('UI sync handlers still consume only their messages after reopening', async () => {
  const device = new FakeHidDevice('hid-sync');
  const wrapper = await connect(device);
  const sync = [];
  const unsubscribe = wrapper.addInputReportHandler((bytes) => {
    if (bytes[0] !== 0xfe) return false;
    sync.push(bytes[1]);
    return true;
  });
  await device.close();
  await wrapper.open();
  device.input([0xfe, 42]);
  await wrapper.write([0, 8, 0, 0x72]);
  assert.deepEqual(sync, [42]);
  assert.equal((await wrapper.readP())[2], 0x72);
  unsubscribe();
  device.input([0xfe, 7]);
  assert.deepEqual(Array.from(await wrapper.readP()), [0xfe, 7]);
});
