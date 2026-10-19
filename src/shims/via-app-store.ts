import defaultsDeep from 'lodash.defaultsdeep';
import type {StoreData} from '../types/types';

export class Store {
  store: StoreData;
  constructor(defaults: StoreData) {
    let saved = {};
    try {
      const parsed = JSON.parse(
        localStorage.getItem('zelvoq-configurator-store') || '{}',
      );
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        saved = parsed;
    } catch {
      // JSON corrupto o almacenamiento bloqueado: arrancar con valores propios.
    }
    this.store = defaultsDeep({}, saved, defaults);
  }
  get<K extends keyof StoreData>(key: K): StoreData[K] {
    return this.store[key];
  }
  set<K extends keyof StoreData>(key: K, value: StoreData[K]) {
    const newStoreData = {
      ...this.store,
      [key]: {...value},
    };
    this.store = newStoreData;
    // Si el navegador bloquea la persistencia, las actualizaciones posteriores
    // deben continuar sobre el mismo estado en memoria (incluida la caché).
    try {
      localStorage.setItem(
        'zelvoq-configurator-store',
        JSON.stringify(newStoreData),
      );
    } catch (error) {
      console.warn(
        'No se pudo guardar la configuración; se conserva en esta sesión.',
        error,
      );
    }
  }
}
