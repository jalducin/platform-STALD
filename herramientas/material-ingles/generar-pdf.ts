// Genera los PDF de estudio de Inglés (openspec: material-pdf-ingles).
// Fuente: herramientas/material-ingles/<nombre>.html (HTML + CSS, tamaño carta, sin recursos de internet).
// Salida: ingles/material/<nombre>.pdf, que GitHub Pages sirve como archivo estático.
// Uso: npx -y deno run -A herramientas/material-ingles/generar-pdf.ts [nombre | --todas]
//   - nombre (opcional): sin extensión; por omisión, guia-tres-tiempos-y-to-be.
//   - --todas: regenera el PDF de cada fuente .html de esta carpeta.
//   Tras cada PDF informa sus páginas: cópialas a `paginas` en ingles/material/indice.json, el catálogo que lista la
//   sección «📚 Material de estudio» (openspec: ingles-material-estudio; ver docs/data-model.md).
//   - CHROME (variable opcional): ruta de Chrome o Chromium. Si falta, se busca el chrome-headless-shell de Playwright
//     (en Windows, chrome.exe completo con --headless puede quedarse colgado; el headless shell imprime sin problema).
// Usa la impresión de Chrome sin encabezado ni pie del navegador: los números de página salen de @page del HTML.

const CARPETA = new URL("./", import.meta.url);
const NOMBRES = Deno.args[0] === "--todas"
  ? [...Deno.readDirSync(CARPETA)].filter((e) => e.isFile && e.name.endsWith(".html")).map((e) => e.name.slice(0, -5)).sort()
  : [Deno.args[0] ?? "guia-tres-tiempos-y-to-be"];

function buscarChrome(): string {
  const propio = Deno.env.get("CHROME");
  if (propio) return propio;
  const win = Deno.build.os === "windows";
  // Windows acepta «/» como separador, así que las rutas se arman igual en todos los sistemas.
  const base = win ? `${Deno.env.get("LOCALAPPDATA")}/ms-playwright` : `${Deno.env.get("HOME")}/.cache/ms-playwright`;
  const carpetas = [...Deno.readDirSync(base)].filter((d) => d.isDirectory).map((d) => d.name).sort().reverse();
  const shell = win ? "chrome-headless-shell-win64/chrome-headless-shell.exe" : "chrome-headless-shell-linux64/chrome-headless-shell";
  const chrome = win ? "chrome-win64/chrome.exe" : "chrome-linux/chrome";
  const candidatos = [
    ...carpetas.filter((c) => /^chromium_headless_shell-\d+$/.test(c)).map((c) => `${base}/${c}/${shell}`),
    ...carpetas.filter((c) => /^chromium-\d+$/.test(c)).map((c) => `${base}/${c}/${chrome}`),
  ];
  for (const ruta of candidatos) {
    try {
      Deno.statSync(ruta);
      return ruta;
    } catch { /* sigue con el siguiente */ }
  }
  throw new Error("No encontré Chrome: define la variable CHROME con su ruta.");
}

const chrome = buscarChrome();
Deno.mkdirSync(new URL("../../ingles/material/", import.meta.url), { recursive: true });
for (const NOMBRE of NOMBRES) {
  const fuente = new URL(`./${NOMBRE}.html`, import.meta.url);
  const destino = new URL(`../../ingles/material/${NOMBRE}.pdf`, import.meta.url);
  const rutaDestino = decodeURIComponent(destino.pathname).replace(/^\/([A-Za-z]:)/, "$1");
  const perfil = Deno.makeTempDirSync({ prefix: "pdf-ingles-" });
  const { code, stderr } = await new Deno.Command(chrome, {
    args: [
      "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${perfil}`,
      "--no-pdf-header-footer", "--virtual-time-budget=5000", `--print-to-pdf=${rutaDestino}`, fuente.href,
    ],
    stdout: "null", stderr: "piped",
  }).output();
  try { Deno.removeSync(perfil, { recursive: true }); } catch { /* Chrome a veces tarda en soltar el perfil */ }
  if (code !== 0) {
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(code);
  }
  const bytes = Deno.readFileSync(destino);
  // Páginas: objetos /Type /Page (no /Pages). La prueba server/material_indice_test.ts cuenta igual.
  const paginas = (new TextDecoder("latin1").decode(bytes).match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  console.log(`ingles/material/${NOMBRE}.pdf: ${(bytes.length / 1024).toFixed(0)} KB, ${paginas} páginas («paginas»: ${paginas} en indice.json)`);
}
