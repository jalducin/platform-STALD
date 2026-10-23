## Contexto

Secundaria, Inglés y la ruta del profe viven en `ingles.html` (`?modo=secundaria`, `?modo=profe`). Las reglas puras de
Secundaria están en `comun/secundaria-datos.js` (`SecundariaDatos`, probadas en Deno) y el dibujo en
`ingles/secundaria-inicio.js` y `ingles/secundaria.js`. La barra inferior y «☰ Más» de Inglés salen del catálogo
`SECCIONES` de `ingles/comun.js` y de `pintarNav()` en `ingles/app.js`.

## Decisiones

1. **Misión principal = regla pura.** `misionPrincipal(items, hoy)` devuelve `{ item, motivo }` con
   `motivo ∈ { 'atrasada', 'hoy', 'adelantar', 'proxima' }` o `null`. «Abierta» = el servidor no la marca
   `proximamente` (misma regla que el botón: `estadoClase(it, hoy).accion !== null`). «Sin hacer» = `!estaHecha(it)`
   (cuenta un intento como hecha, igual que los retos del día). Orden: día de la clase (`diaDeClase`, que respeta `dia`);
   a igual día, el orden de la lista. Grupos:
   - atrasada: `diaDeClase < hoy`, abierta y sin hacer (lo de ayer que vence hoy también: su día ya pasó);
   - hoy: `diaDeClase === hoy`, abierta y sin hacer;
   - adelantar: `diaDeClase > hoy`, abierta y sin hacer;
   - próxima: sin hacer y bloqueada (la de día más cercano), solo si no hubo ninguna de las anteriores.
   Lo de hoy bloqueado (raro: `disponibleDesde` posterior a su día) no cuenta como «hoy»; cae en «próxima» si no hay
   nada abierto, para no decir «al día» con una clase pendiente. Texto: en atrasada y hoy, el estado de la tarjeta
   (`estadoClase`: «Atrasada», «Vence hoy», «Vence mañana»…), que es lo que la alumna necesita saber. Alternativa descartada: «en curso» primero; una clase en curso ya tiene un intento y cuenta como hecha.
   La ruta del profe (`profe-rpg.js`) tiene su propia regla (todo abierto, sin «atrasada»): no se toca. El Inicio de
   Inglés muestra «⚔️ Misión principal del mundo» (`misionInicioHtml`, una misión de proyecto, no una clase): no aplica.
2. **Entregas en la barra.** `barra: true` en la sección `entregas` del admin. `pintarNav()` pinta las secciones en el
   orden del catálogo, con `solo-escritorio` en las que no son de barra (antes pintaba primero las de barra): el menú
   lateral de PC no cambia de orden. Contador: `<span class="nav-contador" data-contador-entregas>` con
   `state.secBandeja.pendientes` (lo que la sección «📥 Entregas» llama «listas para evaluar»); se repinta cuando la
   bandeja llega (`cargarBandejaSec`) o cambia tras evaluar. Sin bandeja o con error, sin contador. A 360 px la barra
   queda en 6 elementos de 60 px, como la de alumnos y alumnas.
3. **Barra de Secundaria aparte de la fila de pestañas.** En celular se oculta `.sec-tabs` (sigue en el DOM con su
   `aria-selected`, así los enlaces profundos y el teclado no cambian) y se muestra `<nav class="sec-barra">` con botones
   `data-sec-tab` y `aria-current`. «☰ Más» abre `#sec-mas` (botones de las demás pestañas); se cierra al elegir, al
   tocar fuera o con Escape (si el foco estaba dentro, vuelve a «☰ Más»). Al cambiar de pestaña desde la barra la página
   sube al inicio (como Inglés) y el foco queda en su botón de la barra (o en «☰ Más» si la pestaña vive ahí); desde un
   acceso del Inicio en celular, igual. Alternativa
   descartada: convertir la fila de pestañas en barra fija con CSS (un `role=tablist` no debe contener el botón «Más» y
   el menú desplegable quedaría dentro del tablist). La barra vive dentro de `#content`: al abrir una clase desaparece,
   como la fila de pestañas, y no se encima con la barra fija del examen. Un hueco (`.sec-barra-hueco`) del alto de la
   barra al final del contenido evita que tape lo último; `scroll-padding-bottom` ya cubre el foco.
   Profe: la barra prioriza su trabajo («📝 Notas» y «📥 Entregas»), así la tarea «Secundaria del profe con alumna y
   Resultados» sigue en 3 toques.
4. **Una fila desde 720 px.** `grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr)`. Entre 720 y 1099 px el
   nombre corto bajo el emoji (≈ 81 px por pestaña con 9 a 768 px); desde 1100 px en línea, nombre largo con 7 y corto
   con 9 (`.sec-tabs-muchas`): ≈ 115 px por pestaña a 1100 px.
5. **Plan de ejemplo con los 9 mundos.** Se amplía el plan de ejemplo que ya usan las E2E de la ruta
   (`tests/fixtures/datos/contenido/profe/plan.json`; `correr.sh` borra la ruta real de la copia antes de superponerlo,
   como en `fix-e2e-rpg`): de 3 a 8 semanas (2026-09-28 a 2026-11-16). Semanas 1–8 caen en los 7 mundos por semana, y
   dos clases por título («Pirámide de Minto» y «Clase: Skills…») en Torre de Minto y Forja de Skills. Las 5 semanas
   nuevas no tienen archivo de actividad: salen «Llega pronto», como en la ruta real, y no cambian lo publicado ni lo
   abierto. Se descartó interceptar el GET en el navegador: el plan del servidor y el de la página serían distintos, y
   con un solo fixture las tres E2E de la ruta revisan los mismos datos.
6. **Dibuja.** Se compara con los valores de texto del JSON (recorrido recursivo) en vez de `includes('"palabra"')`:
   «reloj» es palabra del vocabulario y también llave de la respuesta (`"reloj": <ms>`). La llave `palabra` se busca
   entre las llaves. Se agrega un caso fijo: una sala cuya palabra 0 sea «reloj» (secreto fijo
   `000000000000000000000009`, escrito en la sala de la prueba antes de leerla) y un caso que comprueba que los
   ayudantes sí detectan una fuga real (la palabra como valor y la llave `palabra`).
7. **Tope de tiempo de `navegacion-dispositivos`.** Un pico aislado por carga de la máquina no debe tumbar la prueba,
   pero una pantalla lenta de verdad sí. Si la pantalla más lenta de una tarea en un tamaño llega a `TOPE_MS` (8000),
   la tarea se repite **una** vez en ese tamaño, en una página nueva, solo para medir el tiempo (las demás revisiones
   usan la primera corrida); el paso pasa si el reintento queda bajo el tope y falla si se pasa las dos veces o si el
   reintento falla. El mensaje dice los dos tiempos y la tabla agrega «Tiempo máximo observado» (incluidos reintentos).
   Se descartó subir el tope (perdería la señal) y aislar CPU o red (no se controla en Windows sin privilegios).
   `NAV_TOPE_MS` baja el tope solo para probar el reintento.

## Riesgos

- E2E que tocan pestañas de Secundaria a 360 px: pasan por un ayudante (`tests/e2e/lib/secundaria.js`) que usa la fila,
  la barra o «☰ Más», según lo visible.
- Topes de toques de `navegacion-dispositivos`: «profe-grupos» baja de 7 a 6 en celular; los demás no suben.
