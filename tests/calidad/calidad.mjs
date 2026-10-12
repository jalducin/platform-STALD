// Análisis de calidad reproducible desde la terminal (openspec: calidad-sonar).
// Corre las reglas equivalentes a las que SonarQube for IDE marcó en VS Code y cuenta los avisos por regla de Sonar y
// por archivo. No modifica nada.
//
// Uso (desde tests/calidad, tras `npm install`):
//   npm run calidad                       resumen por regla y por archivo
//   node calidad.mjs --detalle            además, cada aviso (archivo:línea regla mensaje)
//   node calidad.mjs --detalle --contexto 2   y las 2 líneas de código antes y después de cada aviso
//   node calidad.mjs --regla S3358        solo esa regla (se puede repetir)
//   node calidad.mjs --archivo juegos/x   solo archivos cuya ruta empiece así (se puede repetir)
//   node calidad.mjs --json salida.json   guarda el resultado completo en JSON
//
// Como SonarLint, ignora los avisos de una línea que tenga el comentario `NOSONAR` (se cuentan aparte como
// «revisados»). Sale con 0 siempre: es una medición, no una compuerta.
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import postcss from 'postcss';
import postcssHtml from 'postcss-html';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAVES } from './eslint.config.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const CARPETAS_JS = ['juegos', 'ingles', 'comun', 'server'];
const IGNORAR = new Set(['node_modules', 'datos', '.git', '.claude', '.worktrees']);

const args = process.argv.slice(2);
const opcion = (nombre) => args.flatMap((a, i) => (a === nombre && args[i + 1] ? [args[i + 1]] : []));
const detalle = args.includes('--detalle');
const soloReglas = new Set(opcion('--regla'));
const soloArchivos = opcion('--archivo');
const salidaJson = opcion('--json')[0];

/** Archivos con alguna de las extensiones, sin entrar a carpetas ignoradas. */
function listar(dir, extensiones, recursivo = true) {
  const fuera = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      if (recursivo && !IGNORAR.has(nombre)) fuera.push(...listar(ruta, extensiones));
    } else if (extensiones.includes(extname(nombre))) {
      fuera.push(ruta);
    }
  }
  return fuera;
}

const rel = (ruta) => relative(RAIZ, ruta).replaceAll('\\', '/');
const htmls = [...listar(RAIZ, ['.html'], false), ...listar(join(RAIZ, 'juegos'), ['.html'], false)];
const csss = [...listar(join(RAIZ, 'estilos'), ['.css']), ...CARPETAS_JS.flatMap((c) => listar(join(RAIZ, c), ['.css']))];

const avisos = [];
let revisados = 0;
const lineasDe = new Map();
function lineas(archivo) {
  if (!lineasDe.has(archivo)) lineasDe.set(archivo, readFileSync(join(RAIZ, archivo), 'utf8').split(/\r?\n/));
  return lineasDe.get(archivo);
}
function agregar(archivo, linea, regla, mensaje) {
  if ((lineas(archivo)[linea - 1] || '').includes('NOSONAR')) {
    revisados++;
    return;
  }
  avisos.push({ archivo, linea, regla, mensaje });
}

// 1) JS y TS (también los <script> de los HTML) con ESLint.
const eslint = new ESLint({ cwd: RAIZ, overrideConfigFile: join(AQUI, 'eslint.config.mjs') });
const resultados = await eslint.lintFiles([...CARPETAS_JS, ...htmls.map(rel)]);
for (const r of resultados) {
  for (const m of r.messages) {
    if (m.fatal) {
      avisos.push({ archivo: rel(r.filePath), linea: m.line, regla: 'ERROR', mensaje: m.message });
      continue;
    }
    agregar(rel(r.filePath), m.line, CLAVES[m.ruleId] || m.ruleId, m.message);
  }
}

// 2) CSS (archivos .css y <style> de los HTML) con Stylelint: selectores duplicados y valores obsoletos.
const CSS_CLAVES = { 'no-duplicate-selectors': 'css:S4666', 'declaration-property-value-keyword-no-deprecated': 'css:S1874' };
const css = await stylelint.lint({
  cwd: RAIZ,
  files: [...csss, ...htmls].map(rel),
  config: {
    rules: { 'no-duplicate-selectors': true, 'declaration-property-value-keyword-no-deprecated': true },
    overrides: [{ files: ['**/*.html'], customSyntax: 'postcss-html' }],
  },
});
for (const r of css.results) {
  for (const w of r.warnings) agregar(rel(r.source), w.line, CSS_CLAVES[w.rule] || w.rule, w.text);
}

// 3) Contraste (css:S7924): reglas con `color` y fondo literales cuyo contraste no llega a WCAG AA (4.5:1).
function rgb(valor) {
  const v = valor.trim().toLowerCase();
  const nombres = { white: '#ffffff', black: '#000000' };
  const hex = nombres[v] || v;
  let m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  }
  // rgb(r g b) / rgba(r, g, b, a): solo colores opacos (con transparencia el fondo real depende de lo de abajo).
  if (!/^rgba?\(/.test(v) || !v.endsWith(')')) return null;
  const partes = v.slice(v.indexOf('(') + 1, -1).split(/[\s,/]+/).filter(Boolean);
  const textoAlfa = partes[3] ?? '1';
  const alfa = Number.parseFloat(textoAlfa) / (textoAlfa.endsWith('%') ? 100 : 1);
  const canales = partes.slice(0, 3).map(Number);
  return alfa >= 1 && canales.length === 3 && canales.every(Number.isFinite) ? canales : null;
}
function luminancia([r, g, b]) {
  const c = [r, g, b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function revisarContraste(archivo, texto, sintaxis) {
  const raiz = sintaxis ? sintaxis.parse(texto, { from: archivo }) : postcss.parse(texto, { from: archivo });
  raiz.walkRules((regla) => {
    let color = null;
    let fondo = null;
    regla.each((d) => {
      if (d.type !== 'decl') return;
      if (d.prop === 'color') color = d;
      if (d.prop === 'background-color' || d.prop === 'background') fondo = d;
    });
    if (!color || !fondo) return;
    const a = rgb(color.value);
    const b = rgb(fondo.value);
    if (!a || !b) return;
    const ratio = contraste(a, b);
    if (ratio < 4.5) {
      agregar(archivo, color.source.start.line, 'css:S7924', `contraste ${ratio.toFixed(2)}:1 < 4.5:1 en «${regla.selector}»`);
    }
  });
}
for (const f of csss) revisarContraste(rel(f), readFileSync(f, 'utf8'));
for (const f of htmls) revisarContraste(rel(f), readFileSync(f, 'utf8'), postcssHtml());

// 4) Roles ARIA con elemento nativo equivalente (Web:S6819), solo en el marcado de los .html (fuera de <script>).
const NATIVO = {
  group: '<fieldset>', status: '<output>', button: '<button>', checkbox: '<input type="checkbox">', heading: '<h1>…<h6>',
  img: '<img>', link: '<a>', list: '<ul>/<ol>', listitem: '<li>', region: '<section>', navigation: '<nav>', main: '<main>',
  banner: '<header>', contentinfo: '<footer>', dialog: '<dialog>', table: '<table>', row: '<tr>', cell: '<td>',
  separator: '<hr>', radio: '<input type="radio">', textbox: '<input>/<textarea>', progressbar: '<progress>',
  form: '<form>', article: '<article>', complementary: '<aside>', figure: '<figure>', meter: '<meter>',
  option: '<option>', columnheader: '<th>', rowheader: '<th>', combobox: '<select>', listbox: '<select>',
  slider: '<input type="range">', spinbutton: '<input type="number">', searchbox: '<input type="search">',
};
/** El texto con el contenido de <script> y <style> en blanco (se conservan los saltos de línea). */
function sinScripts(texto) {
  const bajo = texto.toLowerCase();
  let fuera = '';
  let i = 0;
  for (;;) {
    const candidatos = [bajo.indexOf('<script', i), bajo.indexOf('<style', i)].filter((n) => n >= 0);
    if (!candidatos.length) return fuera + texto.slice(i);
    const a = Math.min(...candidatos);
    const cierre = bajo.startsWith('<script', a) ? '</script>' : '</style>';
    const b = bajo.indexOf(cierre, a);
    const fin = b < 0 ? texto.length : b + cierre.length;
    fuera += texto.slice(i, a) + texto.slice(a, fin).replaceAll(/[^\n]/g, ' ');
    i = fin;
  }
}
for (const f of htmls) {
  const archivo = rel(f);
  sinScripts(readFileSync(f, 'utf8')).split('\n').forEach((texto, i) => {
    for (const [, etiqueta, atributos = ''] of texto.matchAll(/<([a-z][\w-]*)(\s[^>]*)?>/gi)) {
      const rol = /\brole="(\w+)"/.exec(atributos)?.[1];
      if (NATIVO[rol]) agregar(archivo, i + 1, 'Web:S6819', `role="${rol}" en <${etiqueta}>: usar ${NATIVO[rol]}`);
    }
  });
}

// Resumen.
const filtrados = avisos
  .filter((a) => !soloReglas.size || soloReglas.has(a.regla) || soloReglas.has(a.regla.replace(/^\w+:/, '')))
  .filter((a) => !soloArchivos.length || soloArchivos.some((p) => a.archivo.startsWith(p)))
  .sort((a, b) => a.archivo.localeCompare(b.archivo) || a.linea - b.linea);
const contar = (clave) => Object.entries(filtrados.reduce((t, a) => ({ ...t, [a[clave]]: (t[a[clave]] || 0) + 1 }), {}))
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const porRegla = contar('regla');
const porArchivo = contar('archivo');

if (detalle) {
  const contexto = Number(opcion('--contexto')[0] || 0);
  for (const a of filtrados) {
    console.log(`${a.archivo}:${a.linea}\t${a.regla}\t${a.mensaje}`);
    const desde = contexto ? Math.max(1, a.linea - contexto) : a.linea + 1;
    for (let n = desde; n <= a.linea + contexto; n++) {
      console.log(`  ${n === a.linea ? '>' : ' '}${String(n).padStart(5)} | ${(lineas(a.archivo)[n - 1] || '').slice(0, 220)}`);
    }
  }
  console.log('');
}
console.log('Por regla:');
for (const [r, n] of porRegla) console.log(`  ${String(n).padStart(4)}  ${r}`);
console.log('\nPor archivo:');
for (const [f, n] of porArchivo) console.log(`  ${String(n).padStart(4)}  ${f}`);
console.log(`\nTotal: ${filtrados.length} avisos; ${revisados} revisados con NOSONAR.`);
if (salidaJson) {
  writeFileSync(salidaJson, JSON.stringify({ total: filtrados.length, revisados, porRegla, porArchivo, avisos: filtrados }, null, 2));
}
