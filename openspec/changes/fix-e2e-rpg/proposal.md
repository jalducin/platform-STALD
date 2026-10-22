## Why

Tras la Fase 2 del RPG (2026-10-22), cuatro E2E fallaban en `main` y el tablero de Inglés mostraba una etiqueta confusa:

1. **`peticiones`**: desde `rpg-privacidad`, cada página con sesión (portal, Inglés y Juegos) pedía `GET /interruptores`
   además de `/config`, y cada flujo medido se pasaba de su presupuesto por una petición.
2. **`portal`** («Inglés entra sin volver a pedir el correo»): `ingles.html` mostraba el formulario estático de correo
   (`#login`) mientras cargaba los datos de alguien con sesión, y `#app` no tenía `display:none` hasta que llegaba la
   hoja de estilos. La prueba podía ver `#app` «visible» antes del CSS y el formulario a la vez. No es solo la prueba:
   quien ya tiene sesión ve el formulario unos instantes.
3. **`ruta-profe` y `profe-diseno`** dependían de la ruta real del profe en el repo de datos (hoy empieza el
   2026-10-19, después de `HOY_FIJO` 2026-10-04) y del orden de las pruebas (la pestaña «Hechas» necesitaba que
   `profe-grupo` corriera antes).
4. **Tablero de Inglés**: «🎓 Nivel A1» (nivel de inglés) aparecía junto a «Nivel 2 · Aprendiz» (nivel del juego).

## What Changes

- **Interruptores en `/config`**: el servidor agrega `interruptores` (solo booleanos conocidos) a `/config`, que cada
  página ya pide. `/config` no espera la lectura: usa el último valor leído y lo refresca en segundo plano. El servidor
  los lee al arrancar. `comun/auth.js` expone `StaldAuth.configLeida()` y `comun/interruptores.js` toma de ahí el
  interruptor.
  - Sin `auth.js` (`privacidad.html`, `consentimiento.html`), o si `/config` no los trae, sigue `GET /interruptores`.
  - Falla cerrada: todo apagado.
- **`ingles.html`**: `#login` y `#app` empiezan con `style="display:none"`. `mostrarEntrada()` muestra la entrada y
  `loadFor()` la app. Un error en la primera carga ahora muestra la entrada con el aviso, en lugar de escribirlo en
  la app oculta.
- **E2E de la ruta del profe con su propio fixture**: `tests/fixtures/datos/contenido/profe/` (plan de 3 semanas
  coherente con `HOY_FIJO` 2026-10-04, una semana futura ya abierta y un resultado de ejemplo).
  - `correr.sh` borra la ruta real de la copia antes de superponer el fixture.
  - Ahora borra los `profe.json` reales antes de superponer, no después.
  - `e2e-ruta-profe` espera 200 solo de lo que aún tiene intentos (lo completo responde 409 `sin_intentos`).
- **Presupuesto de la sala** en `e2e-peticiones`: de 40 a 42, con su justificación en el spec `pruebas`. La falla de
  41 viene de 2026-10-12, no de los interruptores. Además, cada flujo verifica que no hay `GET /interruptores` aparte.
- **Etiquetas**: «🎓 Inglés A1» para el nivel de inglés y «Nv. 2 · Aprendiz» (`<abbr title="Nivel del juego">`) para
  el nivel del juego, en el tablero de Inglés, el de Secundaria y el resultado de la clase por pasos. Solo cambian el
  texto y el estilo; las fórmulas siguen igual.

- **«Lo siguiente →» sin desbordar** (`.sec-siguiente`): a 360 px y con un título largo, el botón medía 403 px en un
  contenedor de 326. Se arregla para todas las vistas en `ingles/ingles.css`; #239 solo lo había corregido bajo
  `.vista-admin`.
- **Tras la revisión:** `olvidar()` ya no borra el último valor de los interruptores, y «🎓 Inglés A1» aparece también
  en las guías de material.

## Capabilities

### Modified Capabilities
- `plataforma`: requisito nuevo «Interruptores públicos en /config». Se modifica «Verificación previa reutilizada»:
  la sala pasa a 42 o menos.
- `pruebas`: requisitos nuevos «Ruta del profe de ejemplo en las E2E» y «Presupuestos de peticiones en E2E».
- `ingles`: requisitos nuevos «Entrada de Inglés sin el formulario mientras carga», ««Lo siguiente →» sin desbordar» y «Nivel de inglés y nivel del
  juego con nombres distintos».
- Se actualizan los escenarios con «Nivel N · rango» de los cambios sin archivar `rpg-fase2-ingles` y
  `secundaria-dashboard`.

## Impact

- Servidor: `server/main.ts` (`/config` y lectura al arrancar) y `server/interruptores.ts` (`ultimo()`). Se despliega
  en Deno Deploy con el merge.
- Estáticos:
  - `comun/auth.js?v=9` y `comun/interruptores.js?v=2`;
  - `ingles.html` (`#login`/`#app` y `?v=`);
  - `ingles/alumno.js?v=5`, `ingles/secundaria-inicio.js?v=12`, `ingles/secundaria-clase.js?v=12` y
    `ingles/secundaria.css?v=11`;
  - `index.html`, `juegos.html`, `privacidad.html` y `consentimiento.html` (`?v=`).
- Pruebas:
  - E2E: `correr.sh`, el fixture `tests/fixtures/datos/contenido/profe/` y `resultados/profe-e2e-act-2026-09-28/`,
    `e2e-peticiones`, `e2e-privacidad`, `e2e-ruta-profe` y las que leen el nivel (`ingles-pro`, `misiones`,
    `secundaria-dashboard`, `rpg-ingles`, `ingles-alumno-diseno` y `secundaria-clase`);
  - Deno: `auth_main_test`, `interruptores_main_test` e `interruptores_test`.
- Matriz de acceso: sin cambios. `/config` y `/interruptores` siguen públicas y solo con booleanos. No se agregan datos
  de personas.
- Acciones externas: ninguna (Pages y Deno Deploy publican con el merge; el agente verifica producción).

## Cómo revertir

Revertir el PR. El servidor viejo no manda `interruptores` en `/config` y el cliente nuevo cae a `GET /interruptores`.
