// Hook PreToolUse que protege git (openspec: hook-y-subagentes). Corre `.claude/hooks/proteger-git.mjs` con Node como
// lo haría Claude Code: el evento JSON entra por stdin; código 2 = bloquea (motivo por stderr), código 0 = deja pasar.
// Para el push se crean repos temporales con el remoto de platform-STALD y el del repo de datos.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { fromFileUrl } from "jsr:@std/path@1";

const HOOK = fromFileUrl(new URL("../.claude/hooks/proteger-git.mjs", import.meta.url));

async function correr(entrada: string) {
  const p = new Deno.Command("node", { args: [HOOK], stdin: "piped", stdout: "piped", stderr: "piped" }).spawn();
  const w = p.stdin.getWriter();
  await w.write(new TextEncoder().encode(entrada));
  await w.close();
  const r = await p.output();
  return { code: r.code, err: new TextDecoder().decode(r.stderr) };
}

const evento = (command: string, cwd = Deno.cwd(), tool_name = "Bash") =>
  JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input: { command }, cwd });

async function git(dir: string, ...args: string[]) {
  const r = await new Deno.Command("git", { args: ["-C", dir, ...args], stdout: "null", stderr: "null" }).output();
  assert(r.success, "git " + args.join(" "));
}

async function repoTemporal(remoto: string, rama: string) {
  const dir = await Deno.makeTempDir({ prefix: "hook-git-" });
  await git(dir, "init", "-q", "-b", rama);
  await git(dir, "remote", "add", "origin", remoto);
  return dir;
}

Deno.test("hook: git add de .env se bloquea", async () => {
  for (const cmd of ["git add .env", "git add server/.env.local", "git add -f .env && git commit -m x"]) {
    const r = await correr(evento(cmd));
    assertEquals(r.code, 2, cmd);
    assert(r.err.includes(".env"), cmd + " explica el motivo");
  }
});

Deno.test("hook: .env.example y archivos normales pasan", async () => {
  for (const cmd of ["git add .env.example", "git add server/main.ts", "git commit -m 'docs: .env.example'"]) {
    assertEquals((await correr(evento(cmd))).code, 0, cmd);
  }
});

Deno.test("hook: la carpeta privada IA/ se bloquea", async () => {
  for (const cmd of ["git add IA/", "git add IA/CLAUDE.md", "git add \"IA/Ebook SDD 2026_LIDR.pdf\""]) {
    const r = await correr(evento(cmd));
    assertEquals(r.code, 2, cmd);
    assert(r.err.includes("IA/"), cmd);
  }
  assertEquals((await correr(evento("git add ingles/IAs.js"))).code, 0, "un nombre que solo empieza igual pasa");
});

Deno.test("hook: también vigila la herramienta PowerShell", async () => {
  assertEquals((await correr(evento("git add .env", Deno.cwd(), "PowerShell"))).code, 2);
});

Deno.test("hook: push a main de platform-STALD se bloquea; a una rama feature pasa", async () => {
  const dir = await repoTemporal("https://github.com/jalducin/platform-STALD.git", "main");
  try {
    for (const cmd of ["git push origin main", "git push origin HEAD:main", "git push", `git -C "${dir}" push -u origin feature/x:main`]) {
      const r = await correr(evento(cmd, dir));
      assertEquals(r.code, 2, cmd);
      assert(r.err.includes("feature/"), cmd + " sugiere rama feature/");
    }
    assertEquals((await correr(evento("git push -u origin feature/hook", dir))).code, 0);
    assertEquals((await correr(evento(`cd "${dir}" && git push origin main`, Deno.cwd()))).code, 2, "respeta cd");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: push sin refspec desde una rama feature pasa", async () => {
  const dir = await repoTemporal("git@github.com:jalducin/platform-STALD.git", "feature/algo");
  try {
    assertEquals((await correr(evento("git push", dir))).code, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: el repo privado de datos sí publica en main", async () => {
  const dir = await repoTemporal("https://github.com/jalducin/platform-STALD-data.git", "main");
  try {
    assertEquals((await correr(evento(`git -C "${dir}" push`))).code, 0);
    assertEquals((await correr(evento("git push origin main", dir))).code, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: comandos ajenos y eventos ilegibles pasan", async () => {
  assertEquals((await correr(evento("deno test -A server/"))).code, 0);
  assertEquals((await correr("esto no es json")).code, 0);
  assertEquals((await correr(JSON.stringify({ tool_name: "Read", tool_input: { file_path: ".env" } }))).code, 0);
});
