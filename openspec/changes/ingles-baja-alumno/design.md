## Context

La identidad de Inglés sale solo de `alumnos.json` (`{ "<correo>": { nombre, alta, inicio?, origen? } }`, fila de
`stald_docs` en producción). `filasIngles()` (`server/main.ts`) convierte el registro en filas de identidad que leen
Inglés, el portal (`/perfil`), Juegos (`resolverJugador`: `a-<slug>` si está en Inglés, `s-<nombre>` si solo está en
Secundaria), el registro de Juegos y el alta de contraseña. Los grupos viven en `stald_grupos` y
`stald_inscripciones`; `grupoDe` cae en el primer grupo activo si no hay inscripción vigente.

## Goals / Non-Goals

**Goals:** baja reversible y conservadora (sin borrar nada); fuera de listas, tablero, resumen, avance, calendario y
Meet de Inglés; aviso amable a la alumna; Secundaria y Juegos intactos.

**Non-Goals:** borrar resultados; cambiar «Quitar»; dar de baja de Secundaria o Juegos; correos (la plataforma no
manda correos a los grupos: el Meet y el horario solo se ven en `/ingles/actividades`).

## Decisions

1. **La baja vive en `alumnos.json` (`baja: "AAAA-MM-DD"`), no en `stald_inscripciones`.** Cerrar la inscripción no
   bastaría: `grupoDe` pone a quien no tiene inscripción en el primer grupo activo. Además el registro existe con o
   sin la base de grupos (E2E con `DATA_DIR`). La inscripción vigente se deja igual, así «Reactivar» la regresa al
   mismo grupo sin adivinar. La fecha es la de CDMX (`mxToday`).
2. **Dos vistas del registro.** `filasIngles()` (completo) sigue para identidad: portal, Juegos, registro de Juegos y
   contraseña. `filasInglesActivas()` (sin bajas, `sinBajas`) para Inglés: `/ingles/data`, `/ingles/resumen` y
   `/ingles/actividades`. Así el jugador de Juegos conserva su id `a-<slug>` (ranking, avatar y apodo).
3. **Rutas bajo `/ingles/grupos` pero atendidas por `server/alumnos.ts`** (`handleBajaIngles`), antes de exigir la
   base de grupos: comparten `escribir` (reintento por conflicto y caché del registro).
4. **Idempotencia:** baja sobre alguien ya de baja o reactivar a alguien activo → 200 `sinCambio: true` sin escribir.
   Correo inexistente en el registro → 404 `not_found`; cuerpo inválido → 400 `json_invalido`.
5. **Aviso a la alumna.** `GET /ingles/data` responde `baja: true` solo a la propia persona (nunca la fecha ni datos
   ajenos); la vista no cierra la sesión (sí lo hace con un correo desconocido) para que siga a Secundaria o Juegos.
6. **Perfil:** `accesos.ingles: false`; `conocido`, `nombre` y `juegos` se calculan con el registro completo.

## Risks / Trade-offs

- Sus resultados siguen en `/ingles/actividades` del admin (conteo «N con intentos» de cada elemento): es historial.
- Si el admin mueve de grupo a alguien de baja, se registra la inscripción pero sigue de baja (la UI no lo ofrece).
- `GET /ingles/grupos` omite de `miembros` a quien está de baja (dep `bajas` de `handleGrupos`), aunque su inscripción
  siga vigente: así el conteo de grupos tampoco la cuenta si falla la lista de alumnos.
- El registro tiene caché de 30 s por proceso (`leerRegistro`): otra instancia del servidor puede tardar hasta 30 s en
  reflejar una baja o una reactivación (mismo comportamiento que el alta).
