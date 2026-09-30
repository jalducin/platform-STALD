# Estándares de backend

> **Backend en producción: Deno Deploy** (`https://stald.jalducin.deno.net`, `server/main.ts`). Los datos
> viven como JSON en el repo privado `jalducin/platform-STALD-data`. Ya no se usa Supabase ("Fidello QAS").
> La configuración está en [deno-deploy-setup.md](deno-deploy-setup.md). Las secciones de Supabase de este
> documento describen la versión anterior (v14). Sigue desplegada, pero las páginas dejaron de usarla el
> 2026-09-28 y queda como legado.

## 0. Backend actual: Deno Deploy (`server/`)

| Archivo | Rol |
|---|---|
| `server/main.ts` | Entrypoint: Notion, CORS y rutas `/data`, `/ingles/data`, `/ingles/actividades…` |
| `server/actividades.ts` | Rutas de actividades y exámenes sobre el almacén JSON (caché de contenido de 60 s) |
| `server/motor.ts` | Lógica pura: selección por alumno e intento, calificación, mejor intento, refuerzo |
| `server/store.ts` | `GitHubStore` (API de contenidos, escritura con `sha`) y `MemoryStore` (pruebas) |
| `server/rows.ts` | Extracción de filas de Notion y filtrado por correo |
| `server/semana.ts` | `validarSemana`: revisa una semana completa antes de subirla (errores y avisos) |
| `server/validar_semana.ts` | CLI del validador: `npx -y deno run --allow-read server/validar_semana.ts <dir-datos> <lunes>` (código 1 si hay errores) |

**Variables:** `NOTION_TOKEN`, `SUPER_ADMIN_EMAIL`, `GITHUB_TOKEN` (token fino, solo Contents del repo
de datos) y `DATA_REPO`. Para pruebas: `DATA_DIR`, `ROWS_FIXTURE`, `PORT` y `PERMITIR_HOY=1` (permite
`?hoy=`).

**Rutas `/ingles/actividades`:**

| Ruta | Método | Respuesta |
|---|---|---|
| `/ingles/actividades` | GET | Alumno: elementos de las semanas iniciadas (`id <= hoy`) y exámenes sueltos (los que no referencia ninguna semana, iniciada o no; así una semana subida por adelantado no se asoma), con `estado` (`proximamente`, `disponible`, `en-curso`, `completo`), `intentosUsados`, `mejor` y `ultimoEnvio`. Admin: `resultados` por elemento y `resumen[alumno].temasAReforzar` |
| `/ingles/actividades/<id>` | GET | Con `prorrogas`, el alumno o alumna recibe su propia `fechaLimite` aquí, en la lista y en `fueraDeTiempo`; el admin ve la base. Teoría, tips, temas, `enfoque` (refuerzo) y los ejercicios del intento que toca, **sin respuestas**. 403 `no_disponible`, 409 `sin_intentos`. El admin puede usar `?alumno=` y `?intento=`. En el intento de corrección (no examen) agrega `correccion: { fijas, anteriores }`: `fijas` son sus respuestas correctas y `anteriores` el texto de lo que contestó mal, nunca la respuesta correcta |
| `/ingles/actividades/<id>` | POST `{ intento, respuestas }` | Calificación inmediata, `mejor` y `restantes` (0 si una actividad llega a 100 %). En la corrección, las `fijas` mandan sobre lo que envíe el cliente. 409 `intento_invalido` / `sin_intentos`. El admin no guarda |
| `/ingles/actividades/<id>/resultados/<alumno>` | DELETE | Solo admin: reinicia los intentos |

**Rutas `/juegos/…`** (`server/juegos.ts`, cambio `juegos-plataforma`):

| Ruta | Método | Respuesta |
|---|---|---|
| `/juegos/yo` | GET | Jugador, total, mejores y posición de la semana, y catálogo |
| `/juegos/partida` | POST `{ juego, puntos, aciertos, total, segundos }` | `{ guardado, puntos, mejor, nuevoRecord, total, pos }`. Puntos recortados al tope del juego. 400 si el juego es inválido, 403 `no_registrado`, 429 `limite_diario` (100 por día) |
| `/juegos/ranking` | GET (`?semana=<lunes>`) | Top 20 `{ pos, nombre, tipo, total, juegos }` y `yo`. Sin correos |
| `/juegos/invitado` | POST `{ nombre, acepto: true }` | Registra o hace entrar a un invitado; `{ ya: true }` si el correo ya es alumno o alumna. 400 si falta aceptar o el apodo es inválido; 429 con 500 invitados |
| `/juegos/invitados` | GET | Solo admin: correos, apodos, visitas y puntos de la semana, para análisis |

- **Semana:** de lunes a domingo, hora de CDMX.
- **Total:** suma del mejor puntaje de cada juego.
- **Id del jugador:** `admin`, `a-<slug>` (Inglés), `s-<slug>` (Secundaria) o `i-<hash>` (invitado).
- **Partidas** (`server/salas.ts`, cambio `juegos-partidas`):
  - `POST /juegos/sala` `{ juego, opciones, bots }` → `{ codigo }`.
  - `POST /juegos/sala/<código>/unirse`: 404 si no existe, 409 si ya empezó o está llena (30), 410 si
    venció (3 h).
  - `POST /juegos/sala/<código>/empezar`: solo el host; fija `inicio` = ahora + 5 s.
  - `POST /juegos/sala/<código>/respuesta`:
    - en preguntas, `{ q, correcta, puntos ≤ 200, ms }`, y solo cuenta la primera;
    - en Basta, `{ palabras, basta }`.
  - `GET /juegos/sala/<código>`: sala, jugadores y `ahora` (hora del servidor), solo para sus jugadores y
    el admin. Caché de 2 s.
  - Juegos permitidos: los 8 de preguntas y Basta (es/en).
  - Sincronía por reloj; los bots los calcula el cliente con la semilla.
  - La identidad del jugador se guarda en caché 60 s para no consultar Notion en cada sondeo. La lista de
    invitados siempre se lee fresca.
- **Catálogo (`CATALOGO`):** 18 juegos. Clásicos (`juegos-clasicos`): `basta-es` y `basta-en` (tope 1500),
  `una` y `loteria` (tope 1000).

**Ruta `GET /perfil?email=`** (`server/perfil.ts`):
- Devuelve `{ email, isAdmin, nombre, conocido, invitado, accesos: { ingles, secundaria, juegos } }` para
  el portal. Un invitado registrado (`juegos/invitados.json`) llega con `invitado: true` y solo Juegos.
- Mismas reglas que `/data` e `/ingles/data`; sin filas ni correos ajenos.
- Sin `email` responde 400.

**Ruta `/ingles/data/<pageId>/completado`** (`server/completar.ts`), método POST con `{ completado: boolean }`:
- Marca o desmarca "Completado" en Notion.
- Solo sobre filas visibles para el correo: las del alumno o alumna, o cualquiera para el admin.
- Registra la marca en `avance/<slug>.json`.
- Respuestas:
  - 200 `{ ok, id, completado, registrado }`;
  - 400 `missing_email` / `json_invalido`;
  - 403 `sin_acceso`;
  - 502 `sin_permiso_notion` / `notion_<status>`.
- Requiere que la integración de Notion tenga permiso de actualizar contenido.
- Con `ROWS_FIXTURE`, las marcas se guardan en memoria.

**Pruebas:** `DATA_DIR=<copia del repo de datos> npx -y deno test --allow-env --allow-read` en `server/`
(sin `DATA_DIR` se omiten las de integración; `semana_test.ts` usa datos inline y corre siempre).

**Cargar una semana nueva:** skill `nueva-semana-ingles` (`ai-specs/skills/`). Se prepara el fin de
semana anterior, se valida con la CLI y se sube al repo de datos. Aparece sola su lunes.

---

# Versión anterior: Supabase Edge Function

## 1. Fuente de verdad y despliegue

- El código de la función vive en `supabase/functions/tareas-estudio-secundaria/index.ts`.
  **Lo desplegado debe ser idéntico a lo versionado.** Prohibido editar y desplegar la función
  directamente (desde el dashboard o MCP) sin que el cambio esté en el repo.
- Despliegue (desde la raíz del repo):
  `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api`.
  Tras desplegar, anotar la versión resultante en el reporte del cambio.
- Archivos: `index.ts` (HTTP + llamadas a Notion), `rows.ts` (lógica pura: extracción y filtrado),
  `rows_test.ts` (pruebas).
- Pruebas: `npx -y deno test supabase/functions/tareas-estudio-secundaria/rows_test.ts`
  y verificación de tipos con `npx -y deno check supabase/functions/tareas-estudio-secundaria/index.ts`.

## 2. Configuración y secretos

- Secretos solo en variables de entorno de Supabase (`NOTION_TOKEN`). Nunca en el código ni en el repo.
- Correos de administración, IDs de bases y demás configuración sensible se leen de variables de
  entorno. El repo es **público**: un correo de admin escrito en el código funciona como llave pública.
- Documentar cada variable de entorno nueva en este archivo (§6).

## 3. Contrato HTTP

| Ruta | Método | Parámetros | Respuesta 200 |
|---|---|---|---|
| `/data` | GET | `email` (obligatorio) | `{ rows: SecundariaRow[], isAdmin: boolean, generatedAt: ISO }` |
| `/ingles/data` | GET | `email` (obligatorio) | `{ rows: InglesRow[], isAdmin: boolean, generatedAt: ISO }` |
| cualquier ruta | OPTIONS | — | 200 con CORS |
| cualquier otra | GET | — | `404 { error: "not_found" }` |

### Exámenes (`/ingles/examenes`)

| Ruta | Método | Quién | Respuesta |
|---|---|---|---|
| `/ingles/examenes` | GET | alumno / admin | Lista con `estado` (`proximamente`, `disponible`, `resuelto` + `resultado`); el admin recibe `resultados` de todos |
| `/ingles/examenes/<id>` | GET | alumno (desde `disponibleDesde`) / admin (vista previa) | Preguntas **sin** `correcta` ni `explicacion`; 403 `no_disponible`; 409 `ya_resuelto` |
| `/ingles/examenes/<id>` | POST `{ respuestas }` | alumno / admin | Calificación inmediata: porcentaje, `nivelSugerido`, temas con `estado` y `retroalimentacion`, `fortalezas` / `enProgreso` / `debilidades`, `revision`. El admin no guarda (`guardado: false`) |
| `/ingles/examenes/<id>/resultados/<alumno>` | DELETE | solo admin | Reinicia el intento de un alumno |

- Definiciones: `supabase/functions/tareas-estudio-secundaria/examenes/*.json` (formato en `docs/data-model.md`).
  Motor puro en `examenes.ts`; rutas en `examenes_http.ts`.
- Resultados: Supabase Storage, bucket privado `examenes`, `resultados/<id>/<alumno>.json`, un intento por
  alumno y sin correos. La función crea el bucket si no existe. `?prueba=1` (solo admin) escribe
  `_prueba-admin.json`, que se oculta de los listados.
- Fechas en hora de CDMX (`America/Mexico_City`): se puede resolver desde `disponibleDesde`; después de
  `fechaLimite` se acepta, pero se guarda con `fueraDeTiempo: true`.
- Riesgo aceptado: las respuestas están en el repo público; ver el cambio `examen-diagnostico-a1`.

Errores: `400 { error: "missing_email" }`, `500 { error: "upstream_error" }` (el detalle solo va al log).
Las filas **no** incluyen `userIds` ni `userEmails`; solo `userNames`. Las filas de Inglés incluyen además `calificacion`, `dificultad` y `editadoEn`. Los campos de cada fila están en
`docs/data-model.md` y los tipos en `rows.ts`. Cambiar el contrato exige actualizar
este documento y todas las páginas consumidoras en el mismo cambio.

## 4. Seguridad y privacidad

- **Menor exposición posible**: la respuesta incluye solo los campos que la UI muestra. No devolver
  correos de otros usuarios a quien no sea admin.
- La autorización se decide **en el servidor**; el cliente no filtra por permisos.
- Riesgo conocido: hoy la identidad es "el correo que escribes", sin verificar. Cualquier cambio de acceso
  debe decir en su `design.md` si mantiene, mitiga o elimina ese riesgo.
- No registrar en logs correos ni contenido de filas.
- Los errores de Notion no deben filtrar el token ni detalles internos al cliente más allá de un código.

## 5. Código

- TypeScript con interfaces explícitas para cada forma de fila.
- Un solo helper de consulta paginada a Notion (`queryDatabase`) y un extractor por base; no duplicar
  el bucle de paginación.
- Las funciones puras (extracción de propiedades, filtrado por correo) se escriben de forma que se
  puedan probar con `deno test` sin llamar a Notion.

## 6. Variables de entorno

| Variable | Uso | Estado |
|---|---|---|
| `NOTION_TOKEN` | Token de la integración de Notion (lectura + correos de usuarios) | En uso |
| `SUPER_ADMIN_EMAIL` | Correo que ve todas las filas (`isAdmin: true`). Vacío o ausente ⇒ nadie es admin | En uso desde 2026-09-25 |

## 7. Verificación (Step N+2)

El agente ejecuta, como mínimo, contra la función desplegada:

```bash
BASE=https://xozsrcnjnugwbrrrwoeb.supabase.co/functions/v1/tareas-estudio-secundaria
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/data"                 # 400
curl -s "$BASE/data?email=no-existe@example.com" | head -c 200        # rows: []
curl -s "$BASE/ingles/data?email=no-existe@example.com" | head -c 200 # rows: []
```

Además, un correo de alumna asignada (sin escribirlo en el reporte: usar "alumna A") y el caso admin.
