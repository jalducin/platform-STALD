## Why

La plataforma la usan alumnos y alumnas menores de edad y hoy **no tiene aviso de privacidad** (`plataforma-rpg`,
`design.md` §4.3). La Fase 2 de `plataforma-rpg` pide dos piezas antes de que lleguen las misiones, el ranking y el
tutor IA: el aviso de privacidad (tarea 3.13) y un formato simple de consentimiento para madre, padre o tutor (tarea
3.14). Este cambio deriva de `plataforma-rpg` (su tarea 0.2: cada fase en su propio cambio) e implementa solo esas
dos tareas.

El profe pidió que ambas páginas lleguen **apagadas**: el texto todavía es un borrador que él debe revisar y llenar.
Se publican detrás de un interruptor que él enciende con un cambio de dato, sin deploy (patrón de interruptores en
`stald_docs` de `plataforma-rpg`, «Cómo revertir»).

## What Changes

- **Interruptor público `privacidad`** (nuevo, mínimo y genérico):
  - dato `config/interruptores.json` = `{ "privacidad": false }` en `stald_docs` (o en el almacén de datos sin
    Postgres); sin documento → apagado;
  - `GET /interruptores` (sin sesión, solo booleanos de llaves conocidas, caché 60 s en memoria y `public,
    max-age=60`; falla cerrada) en `server/interruptores.ts`;
  - `comun/interruptores.js`: muestra u oculta en el navegador lo marcado con `data-interruptor` y
    `data-interruptor-apagado`.
- **`privacidad.html`** (pública): aviso de privacidad integral y simplificado, en lenguaje claro, alineado con la
  LFPDPPP sin ser asesoría legal, con nota visible de borrador y campos `[pendiente]` para el profe.
- **`consentimiento.html`** (pública, imprimible en carta): autorizaciones de uso, ranking por apodo y, como casillas
  opcionales de fases futuras, tutor IA e imagen o audio; campos en blanco; dice que la plataforma no guarda el
  documento firmado.
- **Enlaces** «🔒 Aviso de privacidad» en el pie de `index.html`, `ingles.html` y `juegos.html`, visibles solo con el
  interruptor encendido.
- `estilos/legal.css` compartido por las dos páginas (claro, oscuro, 360 px, impresión carta).

Fuera de este cambio: registro de consentimientos en `/profe/tutor` (Fase 3), panel de interruptores para el profe
(Fase 4) y el texto final aprobado (lo aprueba el profe antes de encender).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `portal`: requisitos nuevos (ADDED) de interruptores públicos y de aviso de privacidad y formato de consentimiento.

## Impact

- Superficies: `index.html`, `ingles.html`, `juegos.html` (solo el pie y un script), páginas nuevas
  `privacidad.html` y `consentimiento.html`, `comun/interruptores.js`, `estilos/legal.css`, `ingles/ingles.css` y
  `juegos/app/juegos.css` (estilo del pie); servidor Deno (`server/interruptores.ts`, `server/main.ts`,
  `server/http_cache.ts`). Postgres: una fila opcional en `stald_docs` (no hay migración). Sin cambios en Auth,
  Realtime, Notion ni en el repo de datos.
- **Matriz de acceso:**

  | Quién | `GET /interruptores` | `privacidad.html` / `consentimiento.html` | Enlaces en los pies |
  |---|---|---|---|
  | Cualquiera, con o sin sesión (admin, alumno o alumna, invitado) | 200 `{ privacidad }` | Apagado: «Próximamente». Encendido: el texto | Solo encendido |
  | Escritura (`POST`, `PUT`, `DELETE`) | 405 | — | — |

  La respuesta no tiene datos de personas: solo booleanos. El texto de las páginas es público y no lleva correos ni
  nombres reales. Se verifica con pruebas Deno (llaves desconocidas no salen, `"true"` de texto no enciende,
  Postgres caído → apagado) y con E2E (apagado, servidor caído y encendido).
- **Acciones externas:**

  | Acción | Responsable |
  |---|---|
  | Revisar el texto del aviso y del formato, llenar los `[pendiente]` y aprobarlo | Profe |
  | Encender el interruptor con el `insert … on conflict` de `docs/data-model.md` cuando apruebe el texto | Profe (o el agente con su visto bueno) |
  | Redeploy automático al merge y verificación en producción (`/interruptores` → `false`, páginas en «Próximamente») | Agente |

## Cómo revertir

Apagar el interruptor (dato) oculta todo en ≤ 2 minutos. Para quitar el código, revertir el PR: las páginas vuelven a
no existir y los pies quedan como antes. La fila `config/interruptores.json` se puede borrar sin efecto.
