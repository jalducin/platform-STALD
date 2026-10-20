## ADDED Requirements

### Requirement: Hook que protege git

El repo SHALL registrar en `.claude/settings.json` un hook `PreToolUse` para `Bash` y `PowerShell`. Ese hook
ejecuta `.claude/hooks/proteger-git.mjs`, que lee el evento JSON por stdin y decide:
- **Bloquear** con código de salida 2 y el motivo en español por stderr un `git add` o `git commit` cuyo comando
  nombre un archivo `.env` o `.env.<algo>` (excepto `.env.example`) o la carpeta `IA/`.
- **Bloquear** un `git push` cuyo destino sea `main` en el repo `platform-STALD`. Cuenta como destino `main` la
  refspec `main`, `HEAD:main` o `<rama>:main`, y también un push sin refspec hecho desde la rama `main`.
- **Dejar pasar** (código 0) todo lo demás: otros comandos, pushes a ramas `feature/`, pushes al repo privado
  `platform-STALD-data` y eventos que no se puedan leer.

#### Scenario: git add de .env se bloquea
- **WHEN** Claude intenta `git add .env` o `git add server/.env.local`
- **THEN** el hook sale con código 2 y stderr explica que los `.env` no se versionan

#### Scenario: .env.example sí pasa
- **WHEN** el comando es `git add .env.example`
- **THEN** el hook sale con código 0

#### Scenario: carpeta privada IA
- **WHEN** el comando es `git add IA/` o `git add IA/CLAUDE.md`
- **THEN** el hook sale con código 2

#### Scenario: push directo a main
- **WHEN** en platform-STALD el comando es `git push origin main` o `git push origin HEAD:main`
- **THEN** el hook sale con código 2 y sugiere rama `feature/` + PR

#### Scenario: push al repo de datos
- **WHEN** el comando es `git -C <copia de platform-STALD-data> push` en `main`
- **THEN** el hook sale con código 0

#### Scenario: comando ajeno
- **WHEN** el comando es `deno test -A server/` o el JSON de entrada está mal formado
- **THEN** el hook sale con código 0

### Requirement: Subagentes del proyecto

El repo SHALL definir en `ai-specs/agents/` los subagentes `revisor-solo-lectura` y `verificador-pruebas`, con
frontmatter `name`, `description` (cuándo usarlo) y `tools`, y SHALL NOT darles herramientas de edición
(`Edit`, `Write`). El revisor reporta solo huecos de requisitos o correctitud con `archivo:línea`. El verificador
devuelve un resumen: comandos, pasaron, fallaron y la causa probable de cada falla.

#### Scenario: subagentes de solo lectura
- **WHEN** se lee el frontmatter de ambos subagentes
- **THEN** su lista `tools` no incluye `Edit` ni `Write`

### Requirement: Espejos reales de ai-specs

`.claude/agents`, `.claude/skills`, `.gemini/agents` y `.gemini/skills` SHALL ser copias byte a byte de
`ai-specs/agents` y `ai-specs/skills`. No se aceptan archivos de texto con una ruta en su lugar. El script
`ai-specs/scripts/sincronizar-espejos.mjs` SHALL regenerarlas. En `.claude/skills` pueden existir además
skills propias de herramientas externas (las `openspec-*` de la CLI de OpenSpec), que no se tocan.

#### Scenario: un espejo desactualizado rompe la prueba
- **WHEN** una copia en `.claude/` o `.gemini/` difiere de su fuente en `ai-specs/` o falta
- **THEN** `server/espejos_agentes_test.ts` falla y nombra el archivo
