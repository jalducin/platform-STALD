# Diseño — rpg-fase2-ingles

> Deriva de `openspec/changes/plataforma-rpg/` (§1.6, §4.1, §4.2 y §6, decisiones del 2026-10-21). Aquí solo lo que
> concreta o cambia esa guía. Personas de los ejemplos: inventadas.

## 1. Interruptor del ranking

- **General:** se reusa el mecanismo de `rpg-privacidad` (en `main` antes de este PR): llave `ranking` de
  `config/interruptores.json` en `stald_docs`, junto a `privacidad`. Sin fila o ilegible → apagado; caché de 60 s por
  servidor (`olvidar()` tras cambiarlo desde «🛡️ Nicks»); también sale en `GET /interruptores` (solo booleanos).
  Se cambia con `POST /profe/ranking { ranking }` (upsert de la fila con `escribirInterruptor`) o con el SQL de
  `docs/data-model.md`.
- **Por grupo:** `gamificacion/config.json` = `{ "gruposSinRanking": [] }`, leído en cada petición (efecto inmediato).
- `server/interruptores.ts` agrega `leerConfigDoc` y `cambiarConfigDoc` (concurrencia optimista) para documentos de
  configuración propios de una pieza (aquí, el apagado por grupo).
- Decisión del profe (2026-10-21, a través de la sesión principal): el ranking se publica **apagado**. Cambia el
  paraguas, que solo preveía apagarlo por grupo: ahora hay además un interruptor general, apagado por defecto.

## 2. Estado del nick sin tocar Juegos

`gamificacion/perfiles/<slug>.json` = `{ aparecer, nickAprobado?, nickRechazado?, motivo?, actualizado }`. El estado
se **deriva** comparando con el nick actual de `juegos/nicks.json` (`a-<slug>`):

| Nick actual | Estado |
|---|---|
| ninguno | `sin_nick` |
| igual a `nickAprobado` | `aprobado` |
| igual a `nickRechazado` | `rechazado` (con `motivo`) |
| otro | `pendiente` |

Así, cambiar el nick en Juegos lo regresa a «pendiente» solo; `server/juegos.ts` únicamente invalida la caché del
ranking (`server/cache_ranking.ts`, módulo aparte para no crear un ciclo de imports).

## 3. Revisión automática del nick

Normaliza (NFKD: letras de ancho completo a su forma básica; sin acentos; minúsculas; números «leet» a letras; «l»
como «i», para que «Ange1» coincida con «Angel») y rechaza con un motivo:

- `caracteres`: queda algo fuera de a-z, 0-9 y espacio (otros alfabetos, como la «а» cirílica que imita a la «a»);
- `repetido`: otra persona tiene el mismo nick en Juegos (Juegos no exige nicks únicos; en el ranking se suplantarían);

- `correo`: `@` o nombres de proveedores (`gmail`, `hotmail`, `outlook`, `yahoo`, `icloud`, `arroba`, `puntocom`);
- `telefono`: 7 dígitos o más;
- `nombre`: el nombre de pila (primera palabra) de **cualquier** persona del registro `alumnos.json`; los de 4 letras o
  más dentro del nick, los de 3 como palabra completa;
- `palabra`: lista `PALABRAS_BLOQUEADAS` (de 5 letras o más dentro del nick; las cortas como palabra completa, para no
  bloquear «Computo» por «puto»).

El mensaje al estudiante no dice qué nombre coincidió. La revisión corre al pedir aparecer, al aprobar y al calcular
el ranking (defensa en profundidad). El profe ve en la cola el motivo de la revisión automática.

## 4. Puntos de constancia y ranking

- `comun/constancia.js` (función pura compartida; el servidor la importa por ruta relativa; la página aún no la carga,
  recibe sus puntos en `yo.puntos`): por actividad con reto,
  **su primer envío** (reintentar no suma), 10 si `fueraDeTiempo` no es verdadero y 5 si sí, contado si su fecha en
  CDMX cae en la semana; 20 por paso de misión (dependencia `pasosMision`, vacía hasta la Fase 2a).
- Se leen los resultados de las actividades visibles que ya abrieron hasta el domingo de la semana (una consulta por
  actividad con `leerCarpeta`). Caché de 60 s por grupo y semana; se invalida al aparecer u ocultarse, aprobar o
  rechazar, cambiar el interruptor y cambiar un nick en Juegos.
- Orden: puntos de mayor a menor; empates comparten posición (1, 2, 2, 4) y se ordenan por nick.
- Posición propia: 1 + cuántas personas visibles tienen más puntos (contándose aunque esté oculta).
- Sin base de grupos (pruebas locales sin Postgres), todas las personas activas forman un solo grupo.
- Respuesta: `{ semana: { desde, hasta }, lista: [{ posicion, nick, puntos }], yo?: { posicion, puntos, visible } }`.
  Errores del almacén → 503 `ranking_no_disponible`.

## 5. Página

- `ingles/rpg-ingles.js`: `renderRpgIngles(act)` dentro de «🏠 Inicio» (después del saludo) y la tarjeta «🏆 Ranking de
  mi grupo» solo si `GET /gamificacion/perfil` respondió `ranking: true`. La última respuesta del ranking se guarda en
  `state.rk` para que volver a dibujar la página no la pierda.
- Insignias de la barra: las 4 de Inglés que ya muestra la página (una sola colección para la persona);
  `barraRpg` recibe el total como cuarto parámetro opcional.
- Admin: sección «🛡️ Nicks» con el interruptor, «⏳ Por revisar» (pidió aparecer y está pendiente) y «👥 Todos los
  nicks». Rechazar pide el motivo en la misma fila (sin `prompt`).

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Que el ranking deje deducir calificaciones | Solo constancia (envíos a tiempo o tarde); prueba que recorre el JSON |
| Nick que identifica u ofende | Revisión automática + aprobación del profe + vuelve a pendiente al cambiar |
| Varias instancias de Deno Deploy con caché distinta | Caché de 60 s como máximo; el interruptor se lee en cada petición |
| «Nivel A1» (nivel de inglés) junto a «Nivel 1» (nivel RPG) | Resuelto en `fix-e2e-rpg`: «🎓 Inglés A1» y «Nv. 1 · Aprendiz» |
