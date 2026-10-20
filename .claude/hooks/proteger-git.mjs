// Hook PreToolUse de Claude Code (openspec: hook-y-subagentes). Lee el evento JSON por stdin y bloquea con código 2
// (motivo por stderr, que Claude lee) lo que en este repo nunca debe pasar:
//   - git add / git commit que nombren un .env (salvo .env.example) o la carpeta privada IA/;
//   - git push a main de platform-STALD (el repo privado de datos sí publica en main, por diseño).
// Cualquier otra cosa, o un evento que no se entienda, sale con 0: el hook nunca debe trabar la sesión.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const bloquear = (motivo) => {
  process.stderr.write("🛑 Bloqueado por el hook proteger-git: " + motivo + "\n");
  process.exit(2);
};

// Separa "cd x && git add y; git push" en segmentos y cada segmento en palabras, respetando comillas.
function segmentos(comando) {
  return comando.split(/&&|\|\||[;|\n]/).map((s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? [])
    .map((p) => p.replace(/^["']|["']$/g, ""))).filter((p) => p.length);
}

function git(dir, ...args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const esEnv = (p) => /(^|[\\/])\.env(\.[\w-]+)?$/.test(p) && !p.endsWith(".env.example");
const esIA = (p) => /^(\.[\\/])?IA([\\/]|$)/.test(p);

// "git -C dir -c x=y push origin main" → { dir, sub: "push", args: ["origin", "main"] }
function leerGit(palabras, dir) {
  let i = 1;
  while (i < palabras.length && palabras[i].startsWith("-")) {
    if (palabras[i] === "-C" && palabras[i + 1]) dir = resolve(dir, palabras[i + 1]);
    i += palabras[i] === "-C" || palabras[i] === "-c" ? 2 : 1;
  }
  return { dir, sub: palabras[i], args: palabras.slice(i + 1) };
}

function revisarArchivos(args) {
  const env = args.find(esEnv);
  if (env) bloquear(`«${env}» es un .env: lleva secretos y nunca se versiona (usa .env.example).`);
  const ia = args.find(esIA);
  if (ia) bloquear(`«${ia}» está en IA/, la carpeta privada del profe (ebook de pago y notas de Podemos).`);
}

function revisar(evento) {
  const comando = evento?.tool_input?.command;
  if (typeof comando !== "string") return;
  let dir = typeof evento.cwd === "string" ? evento.cwd : process.cwd();
  for (const palabras of segmentos(comando)) {
    if (palabras[0] === "cd" && palabras[1]) dir = resolve(dir, palabras[1]);
    if (palabras[0] !== "git") continue;
    const g = leerGit(palabras, dir);
    if (g.sub === "add" || g.sub === "commit") revisarArchivos(g.args);
    if (g.sub === "push") revisarPush(g.dir, g.args);
  }
}

function revisarPush(dir, args) {
  const remoto = git(dir, "remote", "get-url", "origin");
  if (!/[/:]jalducin\/platform-STALD(\.git)?$/i.test(remoto)) return; // otro repo (p. ej. platform-STALD-data)
  const posicionales = args.filter((a) => !a.startsWith("-"));
  const refspecs = posicionales.slice(1);
  const aMain = refspecs.length
    ? refspecs.some((r) => r.replace(/^\+/, "").split(":").pop() === "main")
    : git(dir, "symbolic-ref", "--short", "HEAD") === "main"; // symbolic-ref también funciona sin commits
  if (aMain) bloquear("nada se sube directo a main. Trabaja en una rama feature/<cambio> y abre un PR.");
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
