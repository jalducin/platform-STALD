## Why

El profe quiere que la plataforma deje de sentirse como «una lista de tareas» y se vuelva una **aventura de
aprendizaje**: un año escolar recorrido como un juego de rol (RPG), con progreso visible, retos prácticos en lugar de
exámenes teóricos y un tutor que guía sin dar la respuesta. Hoy:

- Secundaria (una alumna) ya tiene clases diarias en `contenido/secundaria/` con calificación en el servidor, temas con
  retroalimentación y un mini examen por materia cada bloque de 2 semanas.
- Inglés (un grupo) tiene actividades, examen semanal y refuerzo, pero el avance se ve como tabla de calificaciones.
- La **Fase 1** ya está en curso en Secundaria (dos agentes): dashboard RPG con `comun/gamificacion.js` y la clase
  como «misión» por pasos con +XP. Falta el plan de lo que sigue y las reglas que lo hagan seguro para menores.

Este cambio es **solo la especificación** (aprobada por el profe el 2026-10-21, con las decisiones de `design.md` §6): define la experiencia, la malla de
misiones de 1.º de secundaria, los roles, la arquitectura técnica sobre el stack actual y un plan por fases con
criterios medibles. No implementa código.

La referencia visual es `estilos/nexus_academy_dashboard.html` (archivo local del profe, no versionado). Se toma su
estética (tarjetas oscuras, barras de XP, mapa de mundos), **no** su «Clasificación global» con nombres reales, que
este cambio prohíbe.

## What Changes

1. **Experiencia y gamificación** (capability nueva `gamificacion`):
   - El año escolar como **Mundos → Zonas → Capítulos**: Mundo = bloque temático de una materia (p. ej. Aritmética,
     Biología, Cívica); Zona = bloque de 2 semanas; Capítulo = una clase. El mini examen 🎯 es el «jefe de zona» y la
     misión principal cierra el mundo.
   - Se conservan **sin cambios** las reglas de Fase 1: XP por clase = porcentaje + 20 si es a tiempo (mini examen
     ×2), nivel = floor(XP / 300) + 1, rangos, racha, insignias derivadas y mundos por bloque de materia.
   - Nuevo: misiones diarias y semanales derivadas, árbol de habilidades por materia (a partir de los `temas` y su
     retroalimentación), retroalimentación inmediata (animación, sonido opcional, aviso de XP) y, en Inglés, ranking
     por grupo con el **nick de Juegos**, por puntos de constancia (no por calificaciones) y **oculto por defecto**
     (solo aparece quien lo activa).
2. **Misiones principales** (capability nueva `misiones`): un proyecto o reto práctico por mundo y materia, con pasos,
   entregable **solo en texto** por ahora, rúbrica y evaluación del profe. Piloto: Matemáticas e Inglés. Malla piloto de 1.º de secundaria para Matemáticas, Ciencias, Español,
   Ciencias Sociales, Tecnología e IA e Inglés, alineada a las secuencias de la skill `clases-secundaria`.
3. **Tutor IA socrático** (capability nueva `tutor-ia`): endpoint en Deno con `claude-haiku-5-5`, que guía con preguntas y
   nunca da la respuesta de una pregunta calificable; sin datos personales, con límites, bitácora visible al profe y
   consentimiento de madre, padre o tutor.
4. **Panel del profe** (capability nueva `panel-profe`): misiones como JSON validado (Fase 2) y luego editor en la
   página (Fase 4); evaluación de entregas con rúbrica; métricas; y lista de alumnos y alumnas en riesgo de rezago con
   reglas explícitas.
5. **Arquitectura técnica:** el estado de gamificación se **deriva** de los resultados (no se duplica); en Postgres
   solo se guarda lo que no se puede derivar (nick, preferencia de ranking, entregas, evaluaciones, insignias manuales
   y bitácora del tutor). Caché del cliente y PWA opcional para baja latencia y lectura sin conexión.
6. **Plan por fases** con criterios de aceptación medibles (ver `design.md` §5 y `tasks.md`):
   - Fase 1 (en curso): núcleo de gamificación y dashboard en Secundaria.
   - Fase 2: misiones principales piloto y gamificación en Inglés con ranking por grupo.
   - Fase 3: tutor IA conversacional.
   - Fase 4: panel del profe avanzado.

### No-objetivos

- **Panel para madres, padres o tutores:** fuera de alcance. Solo se pide su consentimiento para el tutor IA (acción
  externa, fuera de la plataforma).
- Ranking global o público, ranking con nombres reales y ranking en Secundaria (una sola alumna).
- Tienda, monedas canjeables, compras o recompensas con valor económico.
- Chat entre alumnos y alumnas, foros o mensajes privados.
- Cambiar el stack (sin framework de frontend, sin build, sin nuevos servicios fuera de Supabase y Deno Deploy),
  salvo el proveedor de IA de la Fase 3, justificado en `design.md` §4.4.

## Capabilities

### New Capabilities

- `gamificacion`: Mundos, Zonas y Capítulos; XP, niveles, rangos, racha e insignias (reglas de Fase 1 como invariante);
  misiones diarias y semanales; árbol de habilidades; retroalimentación inmediata; nick y ranking por grupo en Inglés.
- `misiones`: misión principal por mundo (definición en JSON, pasos, entregable, rúbrica, entrega, evaluación y XP),
  malla de 1.º de secundaria y misiones en Inglés.
- `tutor-ia`: tutor socrático (`POST /tutor/mensaje`), minimización de datos, límites, bitácora, alertas de bienestar,
  consentimiento y apagado.
- `panel-profe`: crear y publicar misiones, evaluar entregas, métricas por materia y por grupo, alumnos y alumnas en
  riesgo de rezago, revisión de la bitácora del tutor y moderación de nicks.

### Modified Capabilities

<!-- Ninguna en este cambio. Las vistas de Fase 1 (dashboard y clase como misión) las especifican sus propios cambios
en curso; este cambio solo fija sus reglas como invariante dentro de `gamificacion`. Si al implementar una fase se
toca un requisito vivo (p. ej. `examenes-secundaria` o `juegos` por el nick), esa fase agrega su delta MODIFIED. -->

## Impact

- **Superficies (cuando se implementen las fases; este PR solo agrega artefactos):**
  - `ingles.html` (modo Secundaria y modo Inglés), `index.html` (perfil), módulos `comun/` (`gamificacion.js` de
    Fase 1, `misiones.js`, `tutor.js`), `ingles/`, `estilos/`.
  - Servidor Deno: rutas nuevas `/misiones/…`, `/gamificacion/…`, `/tutor/…`, `/profe/…` en `server/main.ts`.
  - Postgres de Supabase: documentos nuevos en `stald_docs` (`gamificacion/`, `entregas/`, `tutor/config.json`,
    `borradores/`) y tabla `stald_tutor_bitacora` con migración versionada (Fase 3).
  - Página nueva `privacidad.html` (aviso de privacidad, hoy inexistente), Fase 2.
  - Repo de datos: `contenido/secundaria/misiones/` y `contenido/ingles/misiones/`.
  - Auth y Realtime: sin cambios (Realtime no se usa para gamificación).
  - Notion: no se toca.
- **Matriz de acceso (estado objetivo):**

  | Quién | Su progreso (XP, nivel, árbol) | Progreso de otros | Ranking de su grupo (Inglés) | Entregas | Tutor IA | Panel del profe |
  |---|---|---|---|---|---|---|
  | Admin (profe) | — | Todo, con nombre de pila | Ve nicks, nombre de pila y quién se ocultó (`/profe/nicks`) | Lee y evalúa todas | Lee la bitácora de todos; apaga el tutor | Sí |
  | Alumno o alumna de Secundaria | Sí | No | No hay ranking en Secundaria | Solo las suyas (solo texto) | Sí, si tiene consentimiento registrado | No (403) |
  | Alumno o alumna de Inglés | Sí | No | Solo nicks de Juegos y puntos de constancia de quien activó aparecer; su propia posición aunque esté oculto | Solo las suyas (solo texto) | Sí, si tiene consentimiento registrado | No (403) |
  | De baja de Inglés | Solo lectura de lo suyo | No | No aparece | Solo lectura de las suyas (enviar → 403) | No (403) | No |
  | Invitado de Juegos | No (403) | No | No | No | No | No |
  | Sin sesión | 401 | 401 | 401 | 401 | 401 | 401 |

  Ninguna respuesta lleva correos. El ranking nunca lleva nombres reales, foto, XP ni calificaciones. Recurso no
  visible para la persona → 404; acción sobre lo de otra persona o ruta de admin → 403. Cada fase verifica su fila con pruebas
  Deno y curl (sin sesión, otra persona, admin).
- **Acciones externas:**

  | Acción | Fase | Responsable |
  |---|---|---|
  | Aprobar esta propuesta y las decisiones de `design.md` §6 (hecho el 2026-10-21) | Antes de Fase 2 | Profe (usuario) |
  | Redeploy de Deno Deploy al hacer merge de cada fase y verificación en producción | 2–4 | Agente |
  | Migración de Postgres (si se crea `stald_tutor_bitacora`) aplicada desde el archivo versionado | 3 | Agente, con visto bueno del profe |
  | Subir misiones piloto al repo privado de datos | 2 | Agente (sesión principal, skill `clases-secundaria`) |
  | Confirmar precios de `claude-haiku-5-5` en la página oficial y verificar el número de la Línea de la Vida (bloqueantes) | 3 | Agente, antes de activar |
  | Contratar el proveedor de IA, crear la llave y ponerla en Deno Deploy (`TUTOR_IA_API_KEY`), con tope de gasto; configurar el correo de avisos | 3 | Profe |
  | Aprobar el aviso de privacidad y el formato simple de consentimiento (lo prepara el agente en la Fase 2) | 2 | Profe |
  | Recabar con ese formato el consentimiento firmado de madre, padre o tutor (`tutor` antes de la Fase 3; `multimedia` solo cuando llegue imagen y audio) | 3 | Profe |
  | Revisar y aprobar los nicks de Juegos de quien pide aparecer en el ranking de Inglés | 2 | Profe |

## Cómo revertir

- **Este PR:** solo agrega `openspec/changes/plataforma-rpg/`; se revierte cerrando el PR o borrando la carpeta.
- **Cada fase** se entrega en su propio PR. Las piezas sensibles tienen interruptor en `stald_docs` con efecto
  inmediato y sin redeploy: ranking por grupo (`gamificacion/config.json`) y tutor (`tutor/config.json`). Lo demás se
  revierte revirtiendo el PR de la fase.
- Como el estado de gamificación se deriva de los resultados, apagarla **no pierde datos de calificaciones**. Lo
  guardado en `stald_docs` (nicks, entregas, bitácora) se conserva y se puede borrar con un script de limpieza
  versionado, con respaldo previo.
- El tutor IA tiene un interruptor del profe que lo apaga para todos sin redeploy.
