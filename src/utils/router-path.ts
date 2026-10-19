/** Unificar rutas con slash final para los consumidores de useLocation. */
export const canonicalPath = (path: string): string =>
  path.replace(/\/+$/, '') || '/';
