## ADDED Requirements

### Requirement: Hook que protege git

El repo SHALL registrar en `.claude/settings.json` un hook `PreToolUse` para `Bash` y `PowerShell`. Ese archivo
está **versionado**: `.gitignore` solo excluye `settings.local.json`, que es el personal. El hook ejecuta
`.claude/hooks/proteger-git.mjs`, que lee el evento JSON por stdin y decide:
- **Bloquear** con código de salida 2 y el motivo en español por stderr un `git add` o `git commit` que **incluiría**
  un `.env` o `.env.<algo>` (cualquier número de sufijos, excepto `.env.example`) o algo dentro de la carpeta `IA/`
  en la raíz del repo, sin importar mayúsculas.
  - Se toman en cuenta los nombres escritos en el comando, aunque vengan como ruta absoluta.
  - Para `git add`, también lo que git agregaría de verdad (`git add --dry-run` con los mismos argumentos; cubre
    `-A`, `.` y comodines).
  - Para `git commit`, también lo ya preparado (`git diff --cached`) y, con `-a`, lo modificado.
  - Además, `.gitignore` ignora `**/.env.*`.
- **Bloquear** un `git push` cuyo destino sea `main` en el repo `platform-STALD`.
  - Cuentan como destino `main`: la refspec `main`, `refs/heads/main`, `<origen>:main`, `<origen>:refs/heads/main`,
    `HEAD` estando en la rama `main`, y un push sin refspec desde `main`.
  - El remoto y las refspecs se leen ignorando opciones, incluidas las que llevan valor (`--repo`, `-o`,
    `--push-option`, `--receive-pack`, `--exec`).
- El hook interpreta los comandos así:
  - El directorio de cada comando sigue a `cd`, `chdir`, `pushd`, `Set-Location`, `sl` y `Push-Location` (con o sin
    `-Path`) y a `git -C`.
  - Acepta rutas de Git Bash (`/c/...`).
  - Los separadores (`&&`, `||`, `;`, `|`, salto de línea) cuentan solo fuera de comillas.
  - Ignora el texto de heredocs (`<<'EOF'`) y here-strings de PowerShell (`@' … '@`).
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

#### Scenario: variantes de push a main
- **WHEN** en platform-STALD, desde la rama `main`, el comando es `git push origin HEAD`, `git push origin
  refs/heads/main`, `git push origin HEAD:refs/heads/main`, `git push --repo=origin main` o
  `cd /c/<repo> && git push origin main` (ruta de Git Bash)
- **THEN** el hook sale con código 2

#### Scenario: Set-Location de PowerShell
- **WHEN** el comando es `Set-Location <repo de datos>; git push origin main` (cwd en platform-STALD)
- **THEN** el hook sale con código 0; y con `Set-Location <platform-STALD>; git push origin main` sale con 2

#### Scenario: .env que git agregaría sin nombrarlo
- **WHEN** existe `.env.produccion.local` sin seguimiento y no ignorado, y el comando es `git add -A` o `git add .`
- **THEN** el hook sale con código 2; también con `git add server/.env.production.local` y `git add ia/x.md`

#### Scenario: separadores dentro de comillas o heredoc
- **WHEN** el comando es `git commit -m "fix; git push origin main"` o un commit con mensaje en heredoc cuyo texto
  menciona `git push origin main`
- **THEN** el hook sale con código 0

#### Scenario: comando ajeno
- **WHEN** el comando es `deno test -A server/` o el JSON de entrada está mal formado
- **THEN** el hook sale con código 0

### Requirement: Subagentes del proyecto

El repo SHALL definir en `ai-specs/agents/` los subagentes `revisor-solo-lectura` y `verificador-pruebas`, sin
rutas absolutas ni nombres de usuario locales, con
frontmatter `name`, `description` (cuándo usarlo) y `tools`, y SHALL NOT darles herramientas de edición
(`Edit`, `Write`). El revisor reporta solo huecos de requisitos o correctitud con `archivo:línea`. El verificador
devuelve un resumen: comandos, pasaron, fallaron y la causa probable de cada falla.

#### Scenario: subagentes de solo lectura
- **WHEN** se lee el frontmatter de ambos subagentes
- **THEN** su lista `tools` no incluye `Edit` ni `Write`

### Requirement: Espejos reales de ai-specs

`.claude/agents`, `.claude/skills`, `.gemini/agents` y `.gemini/skills` SHALL ser copias byte a byte de
`ai-specs/agents` y `ai-specs/skills`. No se aceptan archivos de texto con una ruta en su lugar. El script
`ai-specs/scripts/sincronizar-espejos.mjs` SHALL regenerarlas y **borrar** de los espejos lo que ya no exista en
`ai-specs`. Las únicas entradas extra permitidas son skills propias de herramientas externas: las `openspec-*` de la
CLI de OpenSpec, que no se tocan.

#### Scenario: un espejo desactualizado rompe la prueba
- **WHEN** una copia en `.claude/` o `.gemini/` difiere de su fuente en `ai-specs/`, falta, o sobra (no existe en
  `ai-specs/` y no es `openspec-*`)
- **THEN** `server/espejos_agentes_test.ts` falla y nombra el archivo
