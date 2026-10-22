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
   - próxima: `diaDeClase > hoy` y sin hacer (bloqueada), solo si no hubo ninguna de las anteriores.
   Lo de hoy bloqueado (raro: `disponibleDesde` posterior a su día) no cuenta como «hoy»; cae en «próxima» si no hay
   nada abierto. Alternativa descartada: «en curso» primero; una clase en curso ya tiene un intento y cuenta como hecha.
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
   tocar fuera o con Escape. Al cambiar de pestaña desde la barra la página sube al inicio (como Inglés). Alternativa
   descartada: convertir la fila de pestañas en barra fija con CSS (un `role=tablist` no debe contener el botón «Más» y
   el menú desplegable quedaría dentro del tablist). La barra vive dentro de `#content`: al abrir una clase desaparece,
   como la fila de pestañas, y no se encima con la barra fija del examen. Un hueco (`.sec-barra-hueco`) del alto de la
   barra al final del contenido evita que tape lo último; `scroll-padding-bottom` ya cubre el foco.
   Profe: la barra prioriza su trabajo («📝 Notas» y «📥 Entregas»), así la tarea «Secundaria del profe con alumna y
   Resultados» sigue en 3 toques.
4. **Una fila desde 720 px.** `grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr)`. Entre 720 y 1099 px el
   nombre corto bajo el emoji (≈ 81 px por pestaña con 9 a 768 px); desde 1100 px en línea, nombre largo con 7 y corto
   con 9 (`.sec-tabs-muchas`): ≈ 115 px por pestaña a 1100 px.
5. **Fixture propio en la E2E.** La prueba intercepta el GET de `/ingles/profe/actividades` solo en un contexto nuevo y
   responde lo del servidor con `plan` = `tests/fixtures/profe-plan-9-mundos.json` (las 5 clases del fixture compartido
   más clases de ejemplo sin publicar, una o más por mundo). Las que no tienen `item` salen «Llega pronto», como en la
   ruta real. El resto de la prueba sigue contra el servidor y espera los mundos de `Gamificacion.mapaRuta` con el plan
   compartido.
6. **Dibuja.** Se compara con los valores de texto del JSON (recorrido recursivo) en vez de `includes('"palabra"')`:
   «reloj» es palabra del vocabulario y también llave de la respuesta (`"reloj": <ms>`). La llave `palabra` se busca
   entre las llaves. Se agrega un caso fijo: una sala cuya palabra 0 sea «reloj» (se busca el secreto en el test).

## Riesgos

- E2E que tocan pestañas de Secundaria a 360 px: pasan por un ayudante (`tests/e2e/lib/secundaria.js`) que usa la fila,
  la barra o «☰ Más», según lo visible.
- Topes de toques de `navegacion-dispositivos`: «profe-grupos» baja de 7 a 6 en celular; los demás no suben.
