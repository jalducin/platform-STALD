// Pruebas de integración del servidor con el contenido real (openspec: pruebas-fecha-fija): corre
// server/actividades_test.ts con DATA_DIR = la copia de datos que preparó correr.sh, porque en CI no hay datos
// privados y esas pruebas se omiten. Reporta PASS/FAIL como las demás E2E.
require('./lib/entorno'); // DATA y carpeta de salida
const { spawnSync } = require('child_process');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const deno = spawnSync('deno', ['--version'], { shell: true }).status === 0 ? ['deno'] : ['npx', '-y', 'deno'];
const r = spawnSync(deno[0], [...deno.slice(1), 'test', '-A', '--no-check=remote', 'server/actividades_test.ts'], {
  cwd: raiz, shell: true, encoding: 'utf8', env: { ...process.env, DATA_DIR: process.env.DATA, NO_COLOR: '1' },
});
const salida = (r.stdout || '') + (r.stderr || '');
for (const linea of salida.split('\n')) {
  const m = linea.match(/^(.+?) \.\.\. (ok|FAILED|ignored)/);
  if (m) console.log((m[2] === 'ok' ? 'PASS ' : m[2] === 'ignored' ? 'FAIL (omitida sin datos) ' : 'FAIL ') + m[1].trim());
}
const resumen = salida.match(/(ok|FAILED) \| (\d+) passed \| (\d+) failed/);
if (!resumen) { console.log('ERROR no se pudo leer el resultado de deno test\n' + salida.slice(-800)); process.exit(2); }
process.exit(resumen[1] === 'ok' && resumen[3] === '0' ? 0 : 1);
