// Hook PreToolUse que protege git (openspec: hook-y-subagentes). Corre `.claude/hooks/proteger-git.mjs` con Node como
// lo haría Claude Code: el evento JSON entra por stdin; código 2 = bloquea (motivo por stderr), código 0 = deja pasar.
// Para el push se crean repos temporales con el remoto de platform-STALD y el del repo de datos.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { fromFileUrl, join } from "jsr:@std/path@1";

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

// ── Hallazgos de la revisión con contexto limpio (revisor-solo-lectura) ──────────────────────────────────────────
const STALD = "https://github.com/jalducin/platform-STALD.git";
const DATOS = "https://github.com/jalducin/platform-STALD-data.git";
const rutaBash = (p: string) => p.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, l) => "/" + l.toLowerCase());

Deno.test("hook: variantes de push a main se bloquean", async () => {
  const dir = await repoTemporal(STALD, "main");
  try {
    for (
      const cmd of [
        "git push origin HEAD",
        "git push -u origin HEAD",
        "git push origin refs/heads/main",
        "git push origin HEAD:refs/heads/main",
        "git push --repo=origin main",
        "git push -o ci.skip origin main",
        `cd ${rutaBash(dir)} && git push origin main`,
        `git -C ${rutaBash(dir)} push origin main`,
      ]
    ) assertEquals((await correr(evento(cmd, dir))).code, 2, cmd);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: desde una rama feature, HEAD y --repo no cuentan como main", async () => {
  const dir = await repoTemporal(STALD, "feature/x");
  try {
    for (const cmd of ["git push origin HEAD", "git push -u origin HEAD", "git push --repo=origin feature/x"]) {
      assertEquals((await correr(evento(cmd, dir))).code, 0, cmd);
    }
    assertEquals((await correr(evento("git push --repo=origin main", dir))).code, 2, "--repo con main explícito");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: Set-Location, sl, pushd y Push-Location cambian de repo", async () => {
  const stald = await repoTemporal(STALD, "main");
  const datos = await repoTemporal(DATOS, "main");
  try {
    for (const cd of ["Set-Location", "Set-Location -Path", "sl", "pushd", "Push-Location", "cd"]) {
      const aDatos = `${cd} "${datos}"; git push origin main`;
      assertEquals((await correr(evento(aDatos, stald, "PowerShell"))).code, 0, aDatos);
      const aStald = `${cd} "${stald}"; git push origin main`;
      assertEquals((await correr(evento(aStald, datos, "PowerShell"))).code, 2, aStald);
    }
  } finally {
    await Deno.remove(stald, { recursive: true });
    await Deno.remove(datos, { recursive: true });
  }
});

Deno.test("hook: .env e IA/ que git agregaría sin nombrarlos se bloquean", async () => {
  const dir = await repoTemporal(STALD, "feature/x");
  try {
    await Deno.writeTextFile(join(dir, "README.md"), "hola");
    await Deno.writeTextFile(join(dir, ".env.produccion.local"), "SECRETO=1");
    for (const cmd of ["git add -A", "git add .", "git add --all", "git add *"]) {
      assertEquals((await correr(evento(cmd, dir))).code, 2, cmd);
    }
    await Deno.remove(join(dir, ".env.produccion.local"));
    assertEquals((await correr(evento("git add -A", dir))).code, 0, "sin .env, git add -A pasa");
    await Deno.mkdir(join(dir, "IA"));
    await Deno.writeTextFile(join(dir, "IA", "notas.md"), "privado");
    assertEquals((await correr(evento("git add .", dir))).code, 2, "IA/ por git add .");
    for (const cmd of ["git add ia/notas.md", `git add ${join(dir, "IA", "notas.md")}`, "git add server/.env.production.local"]) {
      assertEquals((await correr(evento(cmd, dir))).code, 2, cmd);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: commit con un .env ya preparado o con -a se bloquea", async () => {
  const dir = await repoTemporal(STALD, "feature/x");
  try {
    await Deno.writeTextFile(join(dir, ".env.local"), "SECRETO=1");
    await git(dir, "add", "-f", ".env.local");
    assertEquals((await correr(evento("git commit -m 'cambio'", dir))).code, 2, "staged");
    await git(dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base");
    await Deno.writeTextFile(join(dir, ".env.local"), "SECRETO=2");
    assertEquals((await correr(evento("git commit -am 'cambio'", dir))).code, 2, "commit -a con .env modificado");
    assertEquals((await correr(evento("git commit -m 'cambio'", dir))).code, 0, "sin -a no entra el .env modificado");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hook: separadores dentro de comillas o heredoc no cuentan", async () => {
  const dir = await repoTemporal(STALD, "main");
  try {
    for (
      const cmd of [
        `git commit -m "fix; git push origin main"`,
        `git commit -m 'a && git add .env'`,
        "git commit -q -F - <<'EOF'\nfeat: algo\n\ngit push origin main\ngit add .env\nEOF",
        "git commit -m @'\ngit push origin main\n'@",
      ]
    ) assertEquals((await correr(evento(cmd, dir))).code, 0, cmd);
    assertEquals((await correr(evento("git commit -q -F - <<'EOF'\nx\nEOF\ngit push origin main", dir))).code, 2,
      "lo que va después del heredoc sí cuenta");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
