// Genera los PDF de estudio de Inglés (openspec: material-pdf-ingles).
// Fuente: herramientas/material-ingles/<nombre>.html (HTML + CSS, tamaño carta, sin recursos de internet).
// Salida: ingles/material/<nombre>.pdf, que GitHub Pages sirve como archivo estático.
// Uso: npx -y deno run -A herramientas/material-ingles/generar-pdf.ts [nombre]
//   - nombre (opcional): sin extensión; por omisión, guia-tres-tiempos-y-to-be.
//   - CHROME (variable opcional): ruta de Chrome o Chromium. Si falta, se busca el chrome-headless-shell de Playwright
//     (en Windows, chrome.exe completo con --headless puede quedarse colgado; el headless shell imprime sin problema).
// Usa la impresión de Chrome sin encabezado ni pie del navegador: los números de página salen de @page del HTML.

const NOMBRE = Deno.args[0] ?? "guia-tres-tiempos-y-to-be";
const fuente = new URL(`./${NOMBRE}.html`, import.meta.url);
const destino = new URL(`../../ingles/material/${NOMBRE}.pdf`, import.meta.url);

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

const rutaDestino = decodeURIComponent(destino.pathname).replace(/^\/([A-Za-z]:)/, "$1");
Deno.mkdirSync(new URL("../../ingles/material/", import.meta.url), { recursive: true });
const perfil = Deno.makeTempDirSync({ prefix: "pdf-ingles-" });
const { code, stderr } = await new Deno.Command(buscarChrome(), {
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
const bytes = Deno.statSync(destino).size;
console.log(`ingles/material/${NOMBRE}.pdf: ${(bytes / 1024).toFixed(0)} KB`);
