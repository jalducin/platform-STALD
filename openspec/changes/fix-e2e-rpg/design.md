# Diseño — fix-e2e-rpg

## 1. Interruptores sin petición extra

**Causa:** `comun/interruptores.js` (cambio `rpg-privacidad`) pedía `GET /interruptores` en cada página. Por la caché
HTTP de 60 s, al navegar entre páginas solo costaba una vez, pero cada visita nueva (y cada flujo medido de
`e2e-peticiones`, que abre un contexto limpio) pagaba una petición más.

**Decisión:** los interruptores viajan en `/config`, que toda página con sesión ya pide (caché HTTP de 10 min).

- **Servidor:** `/config` responde `{ …, interruptores: { privacidad, ranking } }` solo en 200 y sin esperar la
  lectura.
  - Usa `leerInterruptores.ultimo()` (el último valor leído, aunque la caché de 60 s ya venció) y dispara la lectura
    en segundo plano.
  - El servidor lee al arrancar, así que en la práctica el primer `/config` ya los trae. En frío (antes de esa
    lectura), `/config` sale sin `interruptores`.
  - De `/config` depende el inicio de sesión de cada página, así que no se le agrega latencia.
- **Cliente:**
  - `comun/auth.js` resuelve `StaldAuth.configLeida()` con el `/config` que leyó `iniciar()`, o con `null` si falló.
  - `comun/interruptores.js` la usa si existe. Si no llega en 15 s, si es `null` o si no trae `interruptores`, pide
    `GET /interruptores` como antes.
  - Falla cerrada en todos los caminos.
- **Costo de frescura:** encender o apagar se nota en ≤ 10 min (caché de `/config`) más ≤ 60 s del servidor, antes
  ≤ 2 min. Se acepta: el profe enciende el aviso una vez y no hay prisa de segundos. `rpg-privacidad` había descartado
  este campo por la caché de 10 min; aquí se acepta ese costo a cambio de no pagar una petición por visita.
- **Alternativas descartadas:**
  - `sessionStorage`: no ahorra en visitas nuevas (cada pestaña nueva paga), y la caché HTTP ya cubre la navegación.
  - Diferir la lectura hasta que el pie sea visible: en páginas cortas el pie se ve de inmediato, y depende del
    tiempo.
  - Subir el presupuesto: no corrige la causa.

## 2. Inglés sin el formulario mientras carga

**Causa:** `#login` era visible por omisión y `#app` solo se ocultaba con `ingles/ingles.css`. Con sesión,
`loadFor()` tarda lo que tarda `/ingles/data`, y mientras tanto se veía el formulario de correo. Además, Playwright
podía ver `#app` antes de que llegara el CSS y `waitForSelector('#app', visible)` resolvía con el formulario aún
visible. Los primeros fallos coincidieron con más CSS y scripts en `ingles.html` (PR #237).

**Decisión:** `style="display:none"` en línea en los dos, para que valga sin CSS.

- Sin sesión, `mostrarEntrada()` muestra la entrada. Con sesión, `loadFor()` muestra la app, la entrada (con aviso)
  o el aviso del profe.
- Efecto secundario deseado: un error en la primera carga va a `mostrarEntrada('⚠️ …')`, porque
  `appEl.style.display === 'none'` ahora es cierto. Antes se escribía en la app oculta.

## 3. Ruta del profe de ejemplo

**Causa:** `ruta-profe` y `profe-diseno` elegían su rama según el plan real del profe. Con la ruta «Claude Code e IA»
(desde 2026-10-19), el día fijo 2026-10-04 cae antes de su inicio: hay `plan`, pero no `semanaPropia`. Además,
«Hechas» dependía de que `profe-grupo` corriera antes.

**Decisión:** fixture propio en `tests/fixtures/datos/contenido/profe/`:

| Semana | Elementos | Estado el 2026-10-04 (domingo) |
|---|---|---|
| 2026-09-28 (actual) | `profe-e2e-act-2026-09-28`, `profe-e2e-examen-2026-10-03` | completa al 100 % (resultado de ejemplo) · pendiente atrasado |
| 2026-10-05 (siguiente) | `profe-e2e-act-2026-10-05` | próximamente |
| 2026-10-12 (futura) | `profe-e2e-act-2026-10-12` (abre 2026-10-01), `profe-e2e-examen-2026-10-17` | abierta adelantada · no abre |

`correr.sh` borra `contenido/profe` de la copia y los `profe.json` reales **antes** de superponer el fixture, así que
el resultado de ejemplo (`tests/fixtures/datos/resultados/profe-e2e-act-2026-09-28/profe.json`) sí llega. Con
`--hoy` cambia el día, pero el fixture está escrito para 2026-10-04.

## 4. Presupuesto de la sala

`sala de 2 personas (30 s, ambas)` mide 41 desde 2026-10-12 (ver el reporte de `juegos-categorias`). Son 14 peticiones
fijas más el sondeo de cada página cada 2.5 s durante unos 33 s. No es una petición nueva: depende del tiempo. El
presupuesto pasa a 42 (14 + 2 × 14) y queda escrito en el spec `pruebas` y en `plataforma`.

## 5. Etiquetas de nivel

- Nivel de inglés: «🎓 Inglés A1» (`#nivel`, `title="Nivel de inglés"`).
- Nivel del juego: «Nv. 2 · Aprendiz» con `<abbr title="Nivel del juego">Nv.</abbr>`, sin subrayado (`#rpg-rango` y
  el resultado de la clase por pasos `.sec-nivel`).
- Las fórmulas (`nivelDe`) y las XP no cambian.
