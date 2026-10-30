import {
  getZelvoqOledModel,
  readOledState,
  UnsupportedFirmwareError,
} from './zelvoq-oled';
import type {OledAPI, OledModel} from './zelvoq-oled';

export type SplitLightingProfile = Exclude<OledModel, 'plus'>;

/** Enum order verified against the three final AVR builds (not QMK's all-effects preset). */
export function splitLightingEffects(model: SplitLightingProfile): string[] {
  if (model === 'corne') {
    return [
      'All Off',
      'Solid Color',
      'Breathing',
      'Cycle Left/Right',
      'Rainbow Moving Chevron',
      'Cycle Pinwheel',
      'Solid Reactive Simple',
      'Solid Reactive',
    ];
  }
  const series = (name: string, count: number) =>
    Array.from({length: count}, (_, index) => `${name} ${index + 1}`);
  return [
    'All Off',
    'Solid Color',
    ...series('Breathing', 4),
    ...series('Rainbow Mood', 3),
    ...series('Rainbow Swirl', 6),
    ...series('Gradient', 10),
    ...(model === 'sofle' ? ['RGB Test', 'Alternating'] : []),
  ];
}

export async function readSplitLightingProfile(
  api: OledAPI,
  definition: Parameters<typeof getZelvoqOledModel>[0],
  device: Parameters<typeof getZelvoqOledModel>[1],
): Promise<SplitLightingProfile | null> {
  const model = getZelvoqOledModel(definition, device);
  if (!model || model === 'plus') return null;
  try {
    const state = await readOledState(api);
    // Only the validated v2 signature supplies enabled, including power OFF.
    return state.enabled === undefined ? null : model;
  } catch (error) {
    if (error instanceof UnsupportedFirmwareError) return null;
    throw error;
  }
}

/** Preserve the bundled menu objects; only confirmed split firmware gets an override. */
export function withSplitLightingMenus<T>(
  menus: T,
  model: SplitLightingProfile | null,
): T {
  if (!model) return menus;
  const transform = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(transform);
    if (!value || typeof value !== 'object') return value;
    const item = value as Record<string, unknown>;
    const content = Array.isArray(item.content) ? item.content : [];
    const result = {
      ...item,
      ...(Array.isArray(item.content)
        ? {content: item.content.map(transform)}
        : {}),
    };
    const matrix = model === 'corne';
    const prefix = matrix ? 'id_qmk_rgb_matrix_' : 'id_qmk_rgblight_';
    const channel = matrix ? 3 : 2;
    if (
      item.type === 'dropdown' &&
      content[0] === `${prefix}effect` &&
      content[1] === channel &&
      content[2] === 2
    ) {
      return {...result, options: splitLightingEffects(model)};
    }
    if (
      item.type === 'color' &&
      content[0] === `${prefix}color` &&
      content[1] === channel &&
      content[2] === 4
    ) {
      return {
        ...result,
        showIf: `{${prefix}effect} != 0${model === 'sofle' ? ` && {${prefix}effect} != 25` : ''}`,
      };
    }
    return result;
  };
  return transform(menus) as T;
}
