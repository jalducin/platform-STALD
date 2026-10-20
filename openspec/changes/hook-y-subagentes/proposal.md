## Why

El profe pidió (2026-10-19): «podemos usar subagentes y un hook, aprovechando que se supone que debo saber». Son
dos temas de su ruta de IA que todavía no aplica en un repo real.

Al revisarlo apareció un problema de fondo: en el checkout de Windows, `.claude/agents/*.md` y 12 de
`.claude/skills/*` no son copias, sino **archivos de texto con la ruta** `../../ai-specs/...`. Son symlinks que Git
guardó como texto (`core.symlinks=false`, modo 100644). Claude Code no los reconoce, así que los agentes
`backend-developer`, `frontend-developer` y `product-strategy-analyst` y skills como `adversarial-review` nunca
estuvieron disponibles. `docs/base-standards.md` §6 ya pide «copia real en Windows».

Además, «nunca subir `.env`», «no versionar la carpeta privada `IA/`» y «no hacer push directo a `main`» hoy solo
son reglas escritas. Un hook las vuelve obligatorias, aunque el agente las olvide.

## What Changes

- **Hook `PreToolUse`** (`.claude/hooks/proteger-git.mjs`, Node, sin dependencias), registrado en
  `.claude/settings.json` para las herramientas `Bash` y `PowerShell`. Bloquea con código 2 y un motivo en español:
  - `git add` o `git commit` que nombren un `.env` (no `.env.example`) o la carpeta `IA/`;
  - `git push` a `main` en este repo (`platform-STALD`). El repo privado de datos se sigue publicando directo en
    `main`, por diseño.

  Todo lo demás pasa (código 0). Si el evento no se entiende, deja pasar: el hook no debe trabar la sesión.
- **Dos subagentes nuevos** en `ai-specs/agents/`:
  - `revisor-solo-lectura`: revisa un diff contra su cambio de OpenSpec y reporta solo huecos de requisitos o de
    correctitud, con `archivo:línea`. No edita.
  - `verificador-pruebas`: corre las pruebas que se le indiquen (Deno o E2E) y devuelve solo el resumen:
    pasaron, fallaron y la causa probable. No edita.
- **Espejos reales:** `.claude/agents`, `.claude/skills`, `.gemini/agents` y `.gemini/skills` pasan a ser
  copias exactas de `ai-specs/`. Se generan con `node ai-specs/scripts/sincronizar-espejos.mjs`.
- **Prueba de espejos:** falla si alguna copia difiere de su fuente en `ai-specs/` (compuerta de cierre de
  base-standards §6).

## Capabilities

### New Capabilities
- `herramientas-agente`: hook de protección de git, subagentes del proyecto y espejos de `ai-specs`.

## Impact

- Superficies: solo herramientas del agente (`.claude/`, `.gemini/`, `ai-specs/`) y docs. No toca páginas,
  servidor, Supabase, Notion ni el repo de datos.
- Matriz de acceso: sin cambios. No involucra datos de alumnos y alumnas.
- Acciones externas: ninguna. El hook se activa al abrir una sesión nueva de Claude Code en el repo; el usuario
  lo revisa con `/hooks`.

## Cómo revertir

Revertir el PR. Para apagar solo el hook, quita la entrada `hooks` de `.claude/settings.json`.
