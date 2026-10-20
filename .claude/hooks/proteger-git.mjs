// Hook PreToolUse de Claude Code (openspec: hook-y-subagentes). Lee el evento JSON por stdin y bloquea con código 2
// (motivo por stderr, que Claude lee) lo que en este repo nunca debe pasar:
//   - git add / git commit que incluirían un .env (salvo .env.example) o algo de la carpeta privada IA/;
//   - git push a main de platform-STALD (el repo privado de datos sí publica en main, por diseño).
// No basta con leer los nombres del comando: también pregunta a git qué entraría de verdad (add --dry-run, diff --cached).
// Cualquier otra cosa, o un evento que no se entienda, sale con 0: el hook nunca debe trabar la sesión.
import { execFileSync } from "node:child_process";
import { basename, relative, resolve } from "node:path";

const bloquear = (motivo) => {
  process.stderr.write("🛑 Bloqueado por el hook proteger-git: " + motivo + "\n");
  process.exit(2);
};

function git(dir, ...args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

// Rutas de Git Bash (/c/Users/...) a rutas de Windows, para que path.resolve no las convierta en C:\c\Users\...
const ruta = (dir, p) => resolve(dir, process.platform === "win32" ? p.replace(/^\/([a-zA-Z])(\/|$)/, "$1:/") : p);

// El texto de heredocs (<<'EOF' … EOF) y here-strings de PowerShell (@' … '@) es contenido, no comandos.
const sinHeredocs = (c) => c
  .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, "")
  .replace(/@(['"])\r?\n[\s\S]*?\r?\n\1@/g, "''");

// Parte el comando en segmentos (&&, ||, ;, |, salto de línea) y palabras, respetando comillas.
function segmentos(comando) {
  const out = [];
  let seg = [], palabra = null, comilla = null;
  const cerrarPalabra = () => { if (palabra !== null) seg.push(palabra); palabra = null; };
  const cerrarSeg = () => { cerrarPalabra(); if (seg.length) out.push(seg); seg = []; };
  const c = sinHeredocs(comando);
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    if (comilla) {
      if (ch === comilla) comilla = null;
      else palabra += ch;
    } else if (ch === '"' || ch === "'") {
      comilla = ch;
      palabra ??= "";
    } else if (ch === ";" || ch === "\n" || ch === "|" || (ch === "&" && c[i + 1] === "&")) {
      if (c[i + 1] === ch) i++;
      cerrarSeg();
    } else if (/\s/.test(ch)) cerrarPalabra();
    else palabra = (palabra ?? "") + ch;
  }
  cerrarSeg();
  return out;
}

const CAMBIAR_DIR = new Set(["cd", "chdir", "pushd", "set-location", "sl", "push-location"]);

function nuevoDir(palabras, dir) {
  const i = palabras.findIndex((p, k) => k > 0 && /^-(literal)?path$/i.test(p));
  const destino = i > 0 ? palabras[i + 1] : palabras.slice(1).find((p) => !p.startsWith("-"));
  return destino ? ruta(dir, destino) : dir;
}

// "git -C dir -c x=y push origin main" → { dir, sub: "push", args: ["origin", "main"] }
function leerGit(palabras, dir) {
  let i = 1;
  while (i < palabras.length && palabras[i].startsWith("-")) {
    if (palabras[i] === "-C" && palabras[i + 1]) dir = ruta(dir, palabras[i + 1]);
    i += palabras[i] === "-C" || palabras[i] === "-c" ? 2 : 1;
  }
  return { dir, sub: palabras[i], args: palabras.slice(i + 1) };
}

// ── add / commit ─────────────────────────────────────────────────────────────────────────────────────────────────
const esEnv = (p) => /^\.env(\..+)?$/i.test(basename(p)) && basename(p).toLowerCase() !== ".env.example";
const esIA = (p) => /^ia(\/|$)/i.test(p);

function revisarRutas(rutas, como) {
  for (const p of rutas) {
    if (esEnv(p)) bloquear(`«${p}» es un .env ${como}: lleva secretos y nunca se versiona (usa .env.example).`);
    if (esIA(p)) bloquear(`«${p}» ${como} está en IA/, la carpeta privada del profe (ebook de pago y notas de Podemos).`);
  }
}

// Nombres escritos en el comando, relativos a la raíz del repo (aceptan rutas absolutas).
function nombresDelComando(dir, raiz, nombres) {
  return nombres.map((n) => {
    const rel = raiz ? relative(raiz, ruta(dir, n)) : n;
    return rel.replaceAll("\\", "/");
  });
}

function revisarAdd(dir, args) {
  const raiz = git(dir, "rev-parse", "--show-toplevel");
  revisarRutas(nombresDelComando(dir, raiz, args.filter((a) => !a.startsWith("-"))), "(nombrado en git add)");
  if (!raiz) return;
  const quedarian = git(dir, "add", "--dry-run", ...args).split("\n")
    .map((l) => l.match(/^add '(.*)'$/)?.[1]).filter(Boolean);
  revisarRutas(quedarian, "(git add lo agregaría)");
}

const COMMIT_CON_VALOR = new Set(["-m", "-F", "-C", "-c", "-t", "--message", "--file", "--author", "--date",
  "--template", "--reuse-message", "--reedit-message", "--fixup", "--squash", "--trailer"]);

function revisarCommit(dir, args) {
  let todos = false;
  const nombres = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") { nombres.push(...args.slice(i + 1)); break; }
    if (a === "-a" || a === "--all") todos = true;
    else if (/^-[a-zA-Z]+$/.test(a)) { // grupo de banderas cortas: -am "msg"
      if (a.includes("a")) todos = true;
      if (/[mFCct]$/.test(a)) i++;
    } else if (COMMIT_CON_VALOR.has(a)) i++;
    else if (!a.startsWith("-")) nombres.push(a);
  }
  const raiz = git(dir, "rev-parse", "--show-toplevel");
  revisarRutas(nombresDelComando(dir, raiz, nombres), "(nombrado en git commit)");
  if (!raiz) return;
  revisarRutas(git(dir, "diff", "--cached", "--name-only").split("\n").filter(Boolean), "(ya preparado)");
  if (todos) revisarRutas(git(dir, "diff", "--name-only").split("\n").filter(Boolean), "(git commit -a lo incluiría)");
}

// ── push ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const PUSH_CON_VALOR = new Set(["--repo", "-o", "--push-option", "--receive-pack", "--exec"]);

function revisarPush(dir, args) {
  let remoto = null;
  const posicionales = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--repo=")) remoto = a.slice(7);
    else if (PUSH_CON_VALOR.has(a)) { if (a === "--repo") remoto = args[i + 1]; i++; }
    else if (!a.startsWith("-")) posicionales.push(a);
  }
  if (remoto === null) remoto = posicionales.shift() ?? "origin";
  const url = /[:/]/.test(remoto) ? remoto : git(dir, "remote", "get-url", remoto);
  if (!/[/:]jalducin\/platform-STALD(\.git)?$/i.test(url)) return; // otro repo (p. ej. platform-STALD-data)
  const rama = git(dir, "symbolic-ref", "--short", "HEAD"); // symbolic-ref también funciona sin commits
  const destino = (r) => {
    const d = r.replace(/^\+/, "").split(":").pop().replace(/^refs\/heads\//, "");
    return d === "HEAD" ? rama : d;
  };
  const aMain = posicionales.length ? posicionales.some((r) => destino(r) === "main") : rama === "main";
  if (aMain) bloquear("nada se sube directo a main. Trabaja en una rama feature/<cambio> y abre un PR.");
}

function revisar(evento) {
  const comando = evento?.tool_input?.command;
  if (typeof comando !== "string") return;
  let dir = typeof evento.cwd === "string" ? evento.cwd : process.cwd();
  for (const palabras of segmentos(comando)) {
    if (CAMBIAR_DIR.has(palabras[0].toLowerCase())) dir = nuevoDir(palabras, dir);
    if (palabras[0] !== "git") continue;
    const g = leerGit(palabras, dir);
    if (g.sub === "add") revisarAdd(g.dir, g.args);
    if (g.sub === "commit") revisarCommit(g.dir, g.args);
    if (g.sub === "push") revisarPush(g.dir, g.args);
  }
}

let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (entrada += c));
process.stdin.on("end", () => {
  let evento;
  try {
    evento = JSON.parse(entrada);
  } catch {
    process.exit(0);
  }
  revisar(evento);
  process.exit(0);
});
