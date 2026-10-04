## Context

- El usuario no quiere afectar Supabase "Fidello QAS", donde hoy viven la Edge Function y el bucket de
  exámenes.
- Pidió "una base de datos de otra forma, tipo RAG": archivos que el admin pueda revisar y que la IA pueda
  leer para preparar las clases.
- El motor del diagnóstico (`examenes.ts`) ya califica con retroalimentación por tema; se generaliza.

## Goals / Non-Goals

**Goals:** ritmo martes / jueves / sábado + viernes + domingo; teoría + ejercicios con 2 intentos y examen
con 1; ejercicios distintos por alumno o alumna; refuerzo según debilidades; datos revisables y fuera de
Fidello.

**Non-Goals:** autenticación fuerte (se mantiene el correo); editor de contenido en la web (el contenido se
edita en JSON, con ayuda de la IA); audio o voz.

## Decisions

1. **Deno Deploy** para el backend: mismo runtime que las Edge Functions, así que se reutiliza el código
   casi sin cambios. Es gratis y queda en la cuenta del usuario. Se despliega enlazando el repo a Deno
   Deploy (se publica con cada push a `main`), sin tokens en manos del agente.
   - Alternativas descartadas: un proyecto Supabase nuevo (posible costo) y Apps Script (reescribir todo).
2. **Repo privado de GitHub como almacén JSON** (`jalducin/platform-STALD-data`), con acceso vía la API de
   contenidos y un token fino limitado a ese repo.
   - Ventajas: historial y diffs de cada resultado, revisión directa en GitHub, lectura con IA (RAG sobre
     archivos) y las respuestas salen del repo público.
   - Límite: 5,000 peticiones por hora con token; con 5 alumnos sobra. Hay caché en memoria de 60 s para
     el contenido.
3. **Motor generalizado** (`server/motor.ts`):
   - Tipos de ejercicio `opcion` y `escribir`.
   - Selección determinista con PRNG (mulberry32) sembrado con un hash de `id|slug|intento`, repartida
     por tema (round-robin).
   - La misma función `grade` sirve para examen, actividad y refuerzo.
4. **Resultado por alumno y actividad**: `{ id, alumno, intentos: [{ n, enviadoEn, preguntas, respuestas,
   calificacion }], mejor }`.
   - Escritura con `sha`; ante un 409 o 422 se relee y se reintenta hasta 3 veces.
   - La selección de cada intento se recalcula igual en el servidor, así que no hay que guardar un "intento
     abierto".
5. **Refuerzo**: los temas se toman del examen semanal (`basadoEn`) del alumno o alumna.
   - Sin examen, se usa el diagnóstico y se mapean sus temas a los del banco (tabla `mapeoTemas`).
6. **Tips** como texto con enlaces de **búsqueda** de YouTube (no IDs de video, para no inventar enlaces
   que no existan).
7. **Transición**:
   - `ingles.html` usa `API_BASE`: la URL de Deno Deploy cuando exista y, mientras tanto, la de Supabase.
   - La función de Supabase no se vuelve a desplegar. Tras migrar y verificar, se documenta que queda
     fuera de uso; borrarla de Supabase lo decide el usuario.

## Risks / Trade-offs

- [El usuario aún no configura Deno Deploy ni el token] → todo se prueba en local con `deno run`, un
  almacén en memoria y filas de Notion simuladas; la publicación queda lista para cuando configure.
- [Contenido de A1 generado por IA] → queda versionado en el repo de datos para que el admin lo revise y lo
  corrija.
- [Suplantación por correo] → igual que antes; el admin puede reiniciar intentos.

## Migration Plan

1. El usuario crea el token y el proyecto en Deno Deploy.
2. El agente migra los resultados del diagnóstico al repo de datos.
3. Push a `main` → Deno Deploy publica.
4. El agente cambia `API_BASE` y verifica con curl y E2E.
5. Supabase queda sin uso.

Rollback: `API_BASE` de vuelta a Supabase (la v14 sigue desplegada).
