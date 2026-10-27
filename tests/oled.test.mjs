import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  OLED_MODES,
  UnsupportedFirmwareError,
  StaleOledSessionError,
  BusyOledError,
  VerificationError,
  parseOledCapabilities,
  readOledState,
  applyOledMode,
  applyOledSettings,
  isZelvoqPlusDefinition,
} from '../src/utils/zelvoq-oled.ts';

const caps = (mode = 0, storedMode = mode) => [
  0x70,
  0x5a,
  0x51,
  1,
  3,
  mode,
  storedMode,
];
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {promise, resolve, reject};
};
const fake = () => {
  const calls = [];
  let mode = 0;
  let storedMode = 0;
  return {
    calls,
    async getCustomMenuValue(bytes, options) {
      calls.push(['get', bytes, options]);
      return bytes[1] === 0x70
        ? caps(mode, storedMode)
        : [0x71, mode, storedMode];
    },
    async setCustomMenuValue(...bytes) {
      calls.push(['set', ...bytes]);
      mode = bytes[2];
    },
    async commitCustomMenu(channel) {
      calls.push(['save', channel]);
      storedMode = mode;
    },
  };
};

const capsV2 = (
  mode = 0,
  storedMode = mode,
  enabled = 1,
  storedEnabled = enabled,
) => [0x70, 0x5a, 0x51, 2, 3, mode, storedMode, enabled, storedEnabled];
const fakeV2 = () => {
  const api = fake();
  let mode = 0,
    storedMode = 0,
    enabled = 1,
    storedEnabled = 1;
  api.getCustomMenuValue = async (bytes, options) => {
    api.calls.push(['get', bytes, options]);
    if (bytes[1] === 0x70)
      return capsV2(mode, storedMode, enabled, storedEnabled);
    if (bytes[1] === 0x71) return [0x71, mode, storedMode];
    if (bytes[1] === 0x72) return [0x72, enabled, storedEnabled];
    throw new Error('Unknown command');
  };
  api.setCustomMenuValue = async (...bytes) => {
    api.calls.push(['set', ...bytes]);
    if (bytes[1] === 0x71) mode = bytes[2];
    if (bytes[1] === 0x72) enabled = bytes[2];
  };
  api.commitCustomMenu = async (channel) => {
    api.calls.push(['save', channel]);
    storedMode = mode;
    storedEnabled = enabled;
  };
  return api;
};

test('protocol v2 parses enabled and persisted enabled with strict boolean bytes', () => {
  assert.deepEqual(parseOledCapabilities(capsV2(2, 1, 0, 1)), {
    mode: 2,
    storedMode: 1,
    enabled: false,
    storedEnabled: true,
  });
  assert.deepEqual(parseOledCapabilities([...capsV2(), ...Array(23).fill(0)]), {
    mode: 0,
    storedMode: 0,
    enabled: true,
    storedEnabled: true,
  });
  for (const result of [
    capsV2().slice(0, 8),
    [...capsV2(), 1],
    [...capsV2(), ...Array(24).fill(0)],
  ]) {
    assert.throws(() => parseOledCapabilities(result));
  }
  for (const index of [7, 8])
    for (const value of [-1, 2, 255, 0.5, NaN, undefined, '1', true]) {
      const result = capsV2();
      result[index] = value;
      assert.throws(() => parseOledCapabilities(result));
    }
});

test('v2 applies mode and enabled, saves together and verifies both active/persisted values', async () => {
  const api = fakeV2();
  assert.deepEqual(await applyOledSettings(api, 2, false), {
    mode: 2,
    storedMode: 2,
    enabled: false,
    storedEnabled: false,
  });
  assert.deepEqual(api.calls, [
    ['get', [0, 0x70], {reportErrors: false}],
    ['set', 0, 0x71, 2],
    ['set', 0, 0x72, 0],
    ['save', 0],
    ['get', [0, 0x71], {reportErrors: false}],
    ['get', [0, 0x72], {reportErrors: false}],
  ]);
  assert.deepEqual(await applyOledSettings(api, 1, true), {
    mode: 1,
    storedMode: 1,
    enabled: true,
    storedEnabled: true,
  });
});

test('settings reject bad arguments before IO and require protocol v2 before SET', async () => {
  for (const enabled of [0, 1, undefined, null, 'true']) {
    const api = fakeV2();
    await assert.rejects(applyOledSettings(api, 1, enabled), VerificationError);
    assert.deepEqual(api.calls, []);
  }
  for (const mode of [3, -1, undefined, '1']) {
    const api = fakeV2();
    await assert.rejects(applyOledSettings(api, mode, true), VerificationError);
    assert.deepEqual(api.calls, []);
  }
  const api = fake();
  await assert.rejects(
    applyOledSettings(api, 1, true),
    UnsupportedFirmwareError,
  );
  assert.deepEqual(api.calls, [['get', [0, 0x70], {reportErrors: false}]]);
});

test('mode-only v2 apply preserves current enabled value and verifies its save', async () => {
  const api = fakeV2();
  await api.setCustomMenuValue(0, 0x72, 0);
  api.calls.length = 0;
  assert.deepEqual(await applyOledMode(api, 1), {
    mode: 1,
    storedMode: 1,
    enabled: false,
    storedEnabled: false,
  });
  assert.deepEqual(api.calls, [
    ['get', [0, 0x70], {reportErrors: false}],
    ['set', 0, 0x71, 1],
    ['set', 0, 0x72, 0],
    ['save', 0],
    ['get', [0, 0x71], {reportErrors: false}],
    ['get', [0, 0x72], {reportErrors: false}],
  ]);
});

test('enabled readback validates ID, booleans, length, padding and persisted agreement', async () => {
  for (const reply of [
    [0x72, 1, 0],
    [0x72, 0, 1],
    [0x71, 0, 0],
    [0x72, 0],
    [0x72, 2, 0],
    [0x72, 0, '0'],
    [0x72, 0, 0, 1],
    [0x72, 0, 0, NaN],
  ]) {
    const api = fakeV2();
    const original = api.getCustomMenuValue;
    api.getCustomMenuValue = async (bytes, options) =>
      bytes[1] === 0x72 ? reply : original(bytes, options);
    await assert.rejects(applyOledSettings(api, 1, false), VerificationError);
  }
});

test('settings guard every v2 await, release shared lock and preserve transport errors', async () => {
  for (let cancelAt = 1; cancelAt <= 6; cancelAt++) {
    const api = fakeV2();
    let current = true,
      count = 0;
    for (const name of [
      'getCustomMenuValue',
      'setCustomMenuValue',
      'commitCustomMenu',
    ]) {
      const original = api[name];
      api[name] = async (...args) => {
        const value = await original(...args);
        if (++count === cancelAt) current = false;
        return value;
      };
    }
    await assert.rejects(
      applyOledSettings(api, 1, false, () => current, 'settings-cancel'),
      StaleOledSessionError,
    );
    assert.equal(api.calls.length, cancelAt);
    await applyOledSettings(fakeV2(), 1, true, () => true, 'settings-cancel');
  }
  const wait = deferred();
  const api = fakeV2();
  const get = api.getCustomMenuValue;
  api.getCustomMenuValue = async (...args) => {
    await wait.promise;
    return get(...args);
  };
  const running = applyOledSettings(api, 1, false, () => true, 'settings-lock');
  await assert.rejects(
    applyOledMode(fakeV2(), 1, () => true, 'settings-lock'),
    BusyOledError,
  );
  wait.resolve();
  await running;
  for (const command of [0x71, 0x72]) {
    const next = fakeV2();
    const set = next.setCustomMenuValue;
    const error = new DOMException('USB disconnected', 'NetworkError');
    next.setCustomMenuValue = async (...bytes) => {
      if (bytes[1] === command) throw error;
      return set(...bytes);
    };
    await assert.rejects(
      applyOledSettings(next, 1, false),
      (value) => value === error,
    );
  }
});

test('OLED modes and capability parsing preserve active and EEPROM state', () => {
  assert.deepEqual(OLED_MODES, ['Pulso', 'Compañero', 'Firma']);
  assert.deepEqual(parseOledCapabilities(caps(2, 1)), {
    mode: 2,
    storedMode: 1,
  });
  assert.deepEqual(parseOledCapabilities([...caps(1), ...Array(25).fill(0)]), {
    mode: 1,
    storedMode: 1,
  });
  for (const payload of [
    null,
    {},
    [],
    new Uint8Array(caps()),
    caps().slice(0, 6),
    [...caps(), 1],
    [...caps(), ...Array(26).fill(0)],
  ]) {
    assert.throws(() => parseOledCapabilities(payload));
  }
  for (let index = 0; index < 7; index++) {
    for (const bad of [-1, 256, 0.5, NaN, undefined, '0']) {
      const value = caps();
      value[index] = bad;
      assert.throws(() => parseOledCapabilities(value));
    }
  }
  for (const [index, value] of [
    [0, 0x71],
    [1, 0],
    [2, 0],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
  ]) {
    const payload = caps();
    payload[index] = value;
    assert.throws(() => parseOledCapabilities(payload));
  }
  const hole = caps();
  delete hole[3];
  assert.throws(() => parseOledCapabilities(hole));
});

test('definition gate checks exact Plus identity and physical VID/PID', () => {
  const device = {vendorId: 0x1209, productId: 3};
  const vpid = (0x1209 << 16) | 3;
  for (const name of ['Zelvoq 60 Plus', '  ZELVOQ 60 PLUS  ', 'Zelvoq60Plus']) {
    assert.equal(
      isZelvoqPlusDefinition({name, vendorProductId: vpid}, device),
      true,
    );
  }
  for (const name of [
    'Zelvoq 60 RGB',
    'Zelvoq 60',
    'Zelvoq 60 Plus fake',
    {content: ['Zelvoq 60 Plus']},
    null,
  ]) {
    assert.equal(isZelvoqPlusDefinition({name}, device), false);
  }
  assert.equal(
    isZelvoqPlusDefinition({name: 'Zelvoq 60 Plus'}, {...device, productId: 2}),
    false,
  );
  assert.equal(
    isZelvoqPlusDefinition({name: 'Zelvoq 60 Plus'}, {...device, vendorId: 1}),
    false,
  );
  assert.equal(
    isZelvoqPlusDefinition(
      {name: 'Zelvoq 60 Plus', vendorProductId: 42},
      device,
    ),
    false,
  );
  assert.equal(isZelvoqPlusDefinition(null, device), false);
  assert.equal(isZelvoqPlusDefinition({name: 'Zelvoq 60 Plus'}, null), false);
});

test('reading checks capability and suppresses optional-command error reporting', async () => {
  const api = fake();
  assert.deepEqual(await readOledState(api), {mode: 0, storedMode: 0});
  assert.deepEqual(api.calls, [['get', [0, 0x70], {reportErrors: false}]]);
  const unsupported = {
    ...fake(),
    async getCustomMenuValue() {
      throw new Error('Receiving incorrect response for command');
    },
  };
  await assert.rejects(readOledState(unsupported), UnsupportedFirmwareError);
  for (const error of [
    new DOMException('Disconnected', 'NetworkError'),
    new Error('write failed'),
    new Error('Receiving incorrect response for command: network'),
  ]) {
    await assert.rejects(
      readOledState({
        ...fake(),
        async getCustomMenuValue() {
          throw error;
        },
      }),
      (candidate) => candidate === error,
    );
  }
});

test('apply validates before IO and executes fresh capability, SET, SAVE and verified readback', async () => {
  for (const value of [-1, 3, 255, 0.5, NaN, '1', null, undefined]) {
    const api = fake();
    await assert.rejects(applyOledMode(api, value), VerificationError);
    assert.deepEqual(api.calls, []);
  }
  const api = fake();
  assert.deepEqual(await applyOledMode(api, 2), {mode: 2, storedMode: 2});
  assert.deepEqual(api.calls, [
    ['get', [0, 0x70], {reportErrors: false}],
    ['set', 0, 0x71, 2],
    ['save', 0],
    ['get', [0, 0x71], {reportErrors: false}],
  ]);
});

test('old firmware or malformed capabilities cause no writes', async () => {
  for (const result of [[0xff], [0x70, 0, 0, 1, 3, 0, 0], caps(3), null]) {
    const api = fake();
    api.getCustomMenuValue = async () => result;
    await assert.rejects(applyOledMode(api, 1));
    assert.deepEqual(api.calls, []);
  }
  const api = fake();
  api.getCustomMenuValue = async () => {
    throw new Error('Receiving incorrect response for command');
  };
  await assert.rejects(applyOledMode(api, 1), UnsupportedFirmwareError);
  assert.deepEqual(api.calls, []);
});

test('readback requires both active and stored mode and validates every response byte', async () => {
  for (const reply of [
    [0x71, 1, 0],
    [0x71, 0, 1],
    [0x70, 1, 1],
    [0x71, 1],
    [0x71, 1, 1, 5],
    [0x71, 1, '1'],
    [0x71, 1, 1, NaN],
  ]) {
    const api = fake();
    api.getCustomMenuValue = async (bytes) =>
      bytes[1] === 0x70 ? caps() : reply;
    await assert.rejects(applyOledMode(api, 1), VerificationError);
  }
  const api = fake();
  api.getCustomMenuValue = async (bytes) =>
    bytes[1] === 0x70 ? caps() : [0x71, 1, 1, ...Array(29).fill(0)];
  assert.deepEqual(await applyOledMode(api, 1), {mode: 1, storedMode: 1});
});

test('reentrant apply is blocked across API objects sharing a device session path', async () => {
  const wait = deferred();
  const first = fake();
  const base = first.getCustomMenuValue;
  first.getCustomMenuValue = async (bytes, options) => {
    if (bytes[1] === 0x70) await wait.promise;
    return base(bytes, options);
  };
  const running = applyOledMode(first, 1, () => true, '/hid/keyboard');
  await assert.rejects(
    applyOledMode(fake(), 2, () => true, '/hid/keyboard'),
    BusyOledError,
  );
  await assert.rejects(
    applyOledMode(first, 2, () => true, '/hid/keyboard'),
    BusyOledError,
  );
  wait.resolve();
  await running;
  assert.deepEqual(
    await applyOledMode(fake(), 2, () => true, '/hid/keyboard'),
    {mode: 2, storedMode: 2},
  );
});

test('object-keyed lock blocks reentrancy and is cleaned after an operation error', async () => {
  const wait = deferred();
  const api = fake();
  const original = api.getCustomMenuValue;
  api.getCustomMenuValue = async (...args) => {
    await wait.promise;
    return original(...args);
  };
  const running = applyOledMode(api, 1);
  await assert.rejects(applyOledMode(api, 2), BusyOledError);
  const error = new Error('USB failed');
  wait.reject(error);
  await assert.rejects(running, (value) => value === error);
  api.getCustomMenuValue = original;
  await applyOledMode(api, 2);
});

test('stale selection before/after capability GET prevents SET, including ABA generations', async () => {
  let generation = 7;
  const selectedGeneration = generation;
  const api = fake();
  await assert.rejects(
    applyOledMode(api, 1, () => false),
    StaleOledSessionError,
  );
  assert.deepEqual(api.calls, []);
  const original = api.getCustomMenuValue;
  api.getCustomMenuValue = async (...args) => {
    const result = await original(...args);
    generation = 9;
    return result;
  };
  await assert.rejects(
    applyOledMode(api, 1, () => generation === selectedGeneration),
    StaleOledSessionError,
  );
  assert.equal(api.calls.filter((call) => call[0] === 'set').length, 0);
});

test('stale after SET does not SAVE or claim success and releases the lock', async () => {
  const api = fake();
  let current = true;
  const baseSet = api.setCustomMenuValue;
  api.setCustomMenuValue = async (...args) => {
    await baseSet(...args);
    current = false;
  };
  await assert.rejects(
    applyOledMode(api, 1, () => current, 'cancel-after-set'),
    StaleOledSessionError,
  );
  assert.deepEqual(
    api.calls.map((call) => call[0]),
    ['get', 'set'],
  );
  // SET already reached the keyboard; cancellation cannot roll it back safely.
  assert.deepEqual(await readOledState(api), {mode: 1, storedMode: 0});
  api.setCustomMenuValue = baseSet;
  await applyOledMode(api, 2, () => true, 'cancel-after-set');
});

test('stale after SAVE or final GET is rejected despite successful USB replies', async () => {
  for (const cancelAt of ['save', 'readback']) {
    const api = fake();
    let current = true;
    if (cancelAt === 'save') {
      const base = api.commitCustomMenu;
      api.commitCustomMenu = async (...args) => {
        await base(...args);
        current = false;
      };
    } else {
      const base = api.getCustomMenuValue;
      api.getCustomMenuValue = async (bytes, options) => {
        const result = await base(bytes, options);
        if (bytes[1] === 0x71) current = false;
        return result;
      };
    }
    await assert.rejects(
      applyOledMode(api, 1, () => current),
      StaleOledSessionError,
    );
    assert.equal(
      api.calls.filter((call) => call[0] === 'get' && call[1][1] === 0x71)
        .length,
      cancelAt === 'save' ? 0 : 1,
    );
  }
});

test('SET/SAVE/readback errors stay errors and never invent a successful save', async () => {
  for (const failure of ['set', 'save', 'readback']) {
    const api = fake();
    const error = new Error(`Failed ${failure}`);
    if (failure === 'set')
      api.setCustomMenuValue = async () => {
        throw error;
      };
    if (failure === 'save')
      api.commitCustomMenu = async () => {
        throw error;
      };
    if (failure === 'readback') {
      const base = api.getCustomMenuValue;
      api.getCustomMenuValue = async (...args) => {
        if (args[0][1] === 0x71) throw error;
        return base(...args);
      };
    }
    await assert.rejects(applyOledMode(api, 1), (value) => value === error);
  }
});
