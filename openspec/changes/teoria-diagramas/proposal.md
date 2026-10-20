## Why

El profe pidió (2026-10-19) «diagramas, cosas que ejemplifiquen todo de una manera fácil» en sus clases de IA (ruta
propia, `ingles.html?modo=profe`). Hoy la teoría solo admite texto, tabla, puntos y ejemplos: no hay forma de dibujar
un flujo, un ciclo o una comparación. El contenido nuevo (otro agente, en paralelo) ya usa el contrato de abajo.

## What Changes

- **Contrato de datos:** `teoria[]` admite `diagrama?` opcional:
  `{ tipo: "flujo" | "ciclo" | "capas" | "ramas" | "comparar", titulo?, pasos: [{ texto, detalle?, icono? }] (2–8),
  centro? (solo ramas, requerido), columnas?: [izq, der] (solo comparar), derecha?: [{ texto, detalle?, icono? }]
  (solo comparar, requerido, 2–8), nota? }`. Fuente única: `docs/data-model.md`.
- **Frontend (`ingles/comun.js`, `ingles/ingles.css`):** `renderTeoria` pinta el diagrama con HTML + CSS (sin
  librerías; todo texto pasa por `escapeHtml`): flujo con flechas (horizontal en pantalla ancha, vertical en
  celular), ciclo con flecha de regreso, capas apiladas, ramas desde un nodo central y comparar en dos columnas.
  Funciona en modo claro y oscuro y a 360 px sin scroll horizontal. Lo usan todas las vistas que muestran teoría
  (alumnos y alumnas, profe, secundaria, material del Meet) porque es el mismo componente.
- **Diapositivas `teoria` del Meet (`ingles/presentacion.js`):** muestran el diagrama del bloque referenciado.
- **Validador (`server/semana.ts`, CLI `server/validar_semana.ts`):** si viene `diagrama`, revisa tipo, 2–8 pasos con
  `texto`, `centro` en ramas, `derecha` (2–8) en comparar, `columnas` de 2 textos y largos razonables; errores claros
  en español.
- **Servidor:** la teoría ya pasa tal cual (`teoria: it.teoria || []`); no hay filtro que cambiar.
- **Skill `nueva-semana-ingles`:** menciona que existe `diagrama`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `actividades-online`: la teoría puede traer un diagrama visual.
- `carga-semanal`: el validador revisa los diagramas.

## Impact

- Superficies: `ingles.html` (`ingles/comun.js`, `ingles/presentacion.js`, `ingles/ingles.css`), las demás páginas
  que carguen esos archivos (subir `?v=`), servidor Deno (`server/semana.ts`, nuevo `server/diagrama.ts`), skill
  `nueva-semana-ingles`, docs.
- Contrato HTTP: sin cambios de forma; `teoria[]` ya viaja completa.
- Matriz de acceso: sin cambios. El diagrama es contenido de la actividad y lo ve quien ya ve su teoría.
- Acciones externas: redeploy automático al hacer merge (agente); verificación en producción solo lectura (agente).
  El contenido con diagramas lo sube otro paso al repo de datos.

## Cómo revertir

Revertir el PR: la teoría vuelve a ignorar `diagrama` (el campo extra no rompe nada) y el validador deja de revisarlo.
