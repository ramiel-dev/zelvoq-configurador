/** Zelvoq Plus OLED custom values, sharing the existing VIA connection. */
export const OLED_MODES = Object.freeze([
  'Pulso',
  'Compañero',
  'Firma',
] as const);
export type OledMode = 0 | 1 | 2;
export type OledState = {mode: OledMode; storedMode: OledMode};

export interface OledAPI {
  getCustomMenuValue(
    bytes: number[],
    options: {reportErrors: false},
  ): Promise<number[]>;
  setCustomMenuValue(...bytes: number[]): Promise<void>;
  commitCustomMenu(channel: number): Promise<void>;
}

export class UnsupportedFirmwareError extends Error {
  constructor() {
    super('Firmware no compatible o respuesta OLED no reconocida.');
    this.name = 'UnsupportedFirmwareError';
  }
}

export class StaleOledSessionError extends Error {
  constructor() {
    super('La selección del teclado cambió durante la operación.');
    this.name = 'StaleOledSessionError';
  }
}

export class BusyOledError extends Error {
  constructor() {
    super('Ya hay un cambio de pantalla en curso para este teclado.');
    this.name = 'BusyOledError';
  }
}

export class VerificationError extends Error {
  constructor(message = 'La respuesta OLED no es válida.') {
    super(message);
    this.name = 'VerificationError';
  }
}

const CHANNEL = 0;
const CAPABILITIES = 0x70;
const MODE = 0x71;
const VIA_RESPONSE_MISMATCH = 'Receiving incorrect response for command';
const activeApplications = new Map<OledAPI | string, symbol>();

function isOledMode(mode: unknown): mode is OledMode {
  return (
    Number.isInteger(mode) && typeof mode === 'number' && mode >= 0 && mode < 3
  );
}

/** The API strips command/channel; padding may remain from the HID report. */
function payloadBytes(result: unknown, minimumLength: number): number[] {
  if (
    !Array.isArray(result) ||
    result.length < minimumLength ||
    result.length > 32
  ) {
    throw new VerificationError();
  }
  for (let index = 0; index < result.length; index++) {
    const value: unknown = result[index];
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 255
    ) {
      throw new VerificationError();
    }
    if (index >= minimumLength && value !== 0) {
      throw new VerificationError();
    }
  }
  return result;
}

export function parseOledCapabilities(result: unknown): OledState {
  const bytes = payloadBytes(result, 7);
  if (
    bytes[0] !== CAPABILITIES ||
    bytes[1] !== 0x5a ||
    bytes[2] !== 0x51 ||
    bytes[3] !== 1 ||
    bytes[4] !== OLED_MODES.length
  ) {
    throw new UnsupportedFirmwareError();
  }
  const [, , , , , mode, storedMode] = bytes;
  if (!isOledMode(mode) || !isOledMode(storedMode)) {
    throw new VerificationError();
  }
  return {mode, storedMode};
}

function parseOledMode(result: unknown): OledState {
  const bytes = payloadBytes(result, 3);
  const [id, mode, storedMode] = bytes;
  if (id !== MODE || !isOledMode(mode) || !isOledMode(storedMode)) {
    throw new VerificationError();
  }
  return {mode, storedMode};
}

export async function readOledState(api: OledAPI): Promise<OledState> {
  let result: number[];
  try {
    result = await api.getCustomMenuValue([CHANNEL, CAPABILITIES], {
      reportErrors: false,
    });
  } catch (error) {
    // KeyboardAPI reports FF/unsupported replies as this exact echo mismatch.
    // Transport/network exceptions remain intact; they do not imply old firmware.
    if (error instanceof Error && error.message === VIA_RESPONSE_MISMATCH) {
      throw new UnsupportedFirmwareError();
    }
    throw error;
  }
  if (Array.isArray(result) && result[0] === 0xff) {
    throw new UnsupportedFirmwareError();
  }
  return parseOledCapabilities(result);
}

/** No rollback: a rejected USB operation may already have reached the device. */
export async function applyOledMode(
  api: OledAPI,
  mode: OledMode,
  isCurrent: () => boolean = () => true,
  sessionKey?: string,
): Promise<OledState> {
  if (!isOledMode(mode)) {
    throw new VerificationError('Elige un modo OLED válido.');
  }
  const ensureCurrent = () => {
    if (!isCurrent()) throw new StaleOledSessionError();
  };
  const checked = async <T>(operation: () => Promise<T>): Promise<T> => {
    ensureCurrent();
    try {
      return await operation();
    } finally {
      ensureCurrent();
    }
  };
  ensureCurrent();
  const key = sessionKey ?? api;
  if (activeApplications.has(key)) throw new BusyOledError();
  const token = Symbol('OLED application');
  activeApplications.set(key, token);
  try {
    await checked(() => readOledState(api));
    await checked(() => api.setCustomMenuValue(CHANNEL, MODE, mode));
    await checked(() => api.commitCustomMenu(CHANNEL));
    const result = await checked(() =>
      api.getCustomMenuValue([CHANNEL, MODE], {reportErrors: false}),
    );
    const state = parseOledMode(result);
    if (state.mode !== mode || state.storedMode !== mode) {
      throw new VerificationError(
        'No se confirmó el modo activo y guardado. Vuelve a leer el teclado.',
      );
    }
    return state;
  } finally {
    if (activeApplications.get(key) === token) activeApplications.delete(key);
  }
}

export function isZelvoqPlusDefinition(
  definition: {name?: unknown; vendorProductId?: unknown} | null | undefined,
  device: {vendorId?: unknown; productId?: unknown} | null | undefined,
): boolean {
  if (
    !definition ||
    !device ||
    device.vendorId !== 0x1209 ||
    device.productId !== 3
  ) {
    return false;
  }
  if (
    definition.vendorProductId !== undefined &&
    definition.vendorProductId !== 0x12090003
  ) {
    return false;
  }
  return (
    typeof definition.name === 'string' &&
    definition.name.replace(/\s+/g, '').toLowerCase() === 'zelvoq60plus'
  );
}
