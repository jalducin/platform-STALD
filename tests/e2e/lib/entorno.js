// Configuración común de las pruebas E2E (openspec: pruebas-en-repo). Cada prueba la carga en su primera línea.
// - Variables con valores por omisión: BASE (estáticos), API (servidor), DATOS (juegos/datos del repo), SALIDA.
//   CHROME es opcional: sin ella Playwright usa su propio Chromium (`npx playwright install chromium`).
//   DATA (copia del repo privado de datos) la pone correr.sh; las pruebas de Inglés la necesitan.
// - Crea la carpeta de salida y se cambia a ella: las capturas con ruta relativa caen ahí (ignorada por git).
// - Sesión de prueba en las llamadas directas: toda petición a API con ?email= lleva `Bearer prueba:<correo>`.
//   El servidor solo acepta ese token cuando corre con ROWS_FIXTURE (nunca en producción). Las pruebas de login
//   lo desactivan con `require('./lib/entorno').sinSesionEnFetch()`.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const porOmision = {
  BASE: 'http://127.0.0.1:8795',
  API: 'http://127.0.0.1:8817',
  DATOS: path.join(RAIZ, 'juegos', 'datos'),
  SALIDA: path.resolve(__dirname, '..', 'salida'),
};
for (const [k, v] of Object.entries(porOmision)) if (!process.env[k]) process.env[k] = v;
process.env.API = process.env.API.replace(/\/$/, '');
process.env.BASE = process.env.BASE.replace(/\/$/, '');

fs.mkdirSync(process.env.SALIDA, { recursive: true });
process.chdir(process.env.SALIDA);

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (url, opciones = {}) => {
  const s = String(url);
  const m = /[?&]email=([^&]+)/.exec(s);
  const yaTiene = opciones.headers && Object.keys(opciones.headers).some(h => h.toLowerCase() === 'authorization');
  if (m && s.startsWith(process.env.API) && !yaTiene) {
    opciones = { ...opciones, headers: { ...opciones.headers, Authorization: 'Bearer prueba:' + decodeURIComponent(m[1]) } };
  }
  return fetchOriginal(url, opciones);
};

// Las pruebas de inicio de sesión manejan el token a mano (prueban, por ejemplo, que ?email= sin token da 401).
const sinSesionEnFetch = () => { globalThis.fetch = fetchOriginal; };

module.exports = { RAIZ, sinSesionEnFetch };
