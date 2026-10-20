import '@webscopeio/react-textarea-autocomplete/style.css';
import {createRoot} from 'react-dom/client';
import './app.global.css';
import Root from './containers/Root';
import {Router} from 'wouter';
import useBrowserLocation from 'wouter/use-location';
import {canonicalPath} from './utils/router-path';
import {updateCSSVariables} from './utils/color-math';
import {
  getThemeModeFromStore,
  getThemeNameFromStore,
} from './utils/device-store';
import {THEMES} from './utils/themes';

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((lng: string) => import(`./locales/${lng}.json`)))
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

const {MODE} = import.meta.env;

// Next puede normalizar /configurador/settings a /configurador/settings/: todos los consumidores
// useLocation (selección, consola y canvas) reciben la misma ruta canónica.
const useCanonicalLocation: typeof useBrowserLocation = (options) => {
  const [path, navigate] = useBrowserLocation(options);
  return [canonicalPath(path), navigate];
};

const elem = document.getElementById('root');
if (elem) {
  const root = createRoot(elem);
  root.render(
    <Router
      base={import.meta.env.BASE_URL.replace(/\/$/, '')}
      hook={useCanonicalLocation}
    >
      <Root />
    </Router>,
  );
  document.documentElement.dataset['themeMode'] = getThemeModeFromStore();
  updateCSSVariables(getThemeNameFromStore() as keyof typeof THEMES);
}
