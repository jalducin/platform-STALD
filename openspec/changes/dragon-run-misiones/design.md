## Context

Así funciona Dragon Run hoy (`juegos/dragon-run.html`):
- Es un canvas de 800×400. Un dragón corre hasta un castillo a 600 m, con 3 vidas y doble salto.
- Hay cuatro obstáculos: roca, tronco, picos y baba. También hay monedas.
- Puntos = metros + monedas × 10, más 200 si llega al castillo.
- Embebido en `juegos.html` (iframe de 2:1), avisa el final con `postMessage` y `terminar()` guarda la partida.
- No tiene avance en el servidor.

Axo y Karts ya guardan su avance con `GET/PUT /juegos/progreso/<juego>` (`server/progreso.ts`): escritura condicional
con `v`, forma exacta y ≤ 4096 bytes. El juego solo habla con `parent`.

El profe dio ejemplos de misiones. Dos no existen en el juego, así que se adaptan a sus mecánicas reales:
- «gemas» pasa a ser **monedas**;
- «jefe del volcán» pasa a ser **llegar al castillo**.

## Goals / Non-Goals

**Goals:**
- Pasar Dragon Run a Arcade.
- Agregar misiones diarias deterministas, logros con tres niveles y premios cosméticos.
- Guardar el avance en el servidor con validación estricta.
- Que se vea bien en un celular de 390 px y respete `prefers-reduced-motion`.

**Non-Goals:**
- Cambiar los puntos del ranking o el tope.
- Modo de sala.
- Tienda o moneda canjeable.
- Cambiar la física o el recorrido del juego.

## Decisions

### 1. Reglas en `juegos/dragon-misiones.js` (nuevo, compartido)
Un solo módulo define todas las reglas: `globalThis.DragonMisiones`, con el mismo patrón que `juegos/mesas.js`.
Contiene:
- `COLORES`, `ESTELAS` y `PREMIOS`;
- `TIPOS`, la bolsa de misiones diarias;
- `LOGROS`;
- `misionesDelDia(fecha, semilla)`;
- `aplicarCarrera(prog, carrera, fecha, semilla)`, que devuelve `{ prog, mensajes }`;
- `vistaMisiones`, `nivelLogro`, `nuevo` y `normalizar`.

El juego lo carga con `<script src="dragon-misiones.js">`. `server/dragon_misiones_test.ts` (archivo propio, para no
chocar con los cambios en paralelo de `progreso_test.ts`) lo importa para comprobar dos cosas:
- que las listas de premios coinciden con las del servidor;
- que todo avance que produce `aplicarCarrera` pasa `validarProgreso("dragon-run", …)`.

Alternativa descartada: meter todo en el HTML. Así no se podría probar con Deno.

### 2. Misiones diarias deterministas
- **Semilla.** Se calcula FNV-1a de `fecha|semilla` y se usa como semilla de `mulberry32`. Con ella se barajan los 7
  tipos, se toman 3 y se elige la meta de cada uno.
- **Fecha.** Es la del día en `America/Mexico_City` (`Intl.DateTimeFormat`).
- **Semilla del jugador.** Es su id, que `juegos.html` pasa en el mensaje `inicio`. Nunca se usa el correo.
- **Resultado.** La misma fecha y el mismo jugador dan siempre las mismas 3 misiones, en cualquier dispositivo.

| tipo | texto | metas | cómo cuenta |
|---|---|---|---|
| `metros` | Recorre N m | 800, 1000, 1500 | suma del día |
| `monedas` | Junta N monedas | 30, 50, 80 | suma del día |
| `racha` | Esquiva N obstáculos seguidos | 10, 15, 20 | máximo en una carrera |
| `castillo` | Llega al castillo 🏰 | 1 | carreras ganadas del día |
| `dobles` | Haz N dobles saltos | 10, 20 | suma del día |
| `carreras` | Corre N carreras | 3 | carreras del día |
| `monedasCarrera` | Junta N monedas en una sola carrera | 15, 25 | máximo en una carrera |

Un obstáculo cuenta como esquivado cuando queda atrás del dragón sin haberlo golpeado. Un golpe reinicia la racha.

### 3. Logros (🥉 bronce, 🥈 plata y 🥇 oro)

| id | nombre | medida | 🥉 | 🥈 | 🥇 |
|---|---|---|---|---|---|
| `explorador` | Explorador | metros totales | 1,000 | 5,000 | 20,000 |
| `coleccionista` | Coleccionista | monedas totales | 50 | 300 | 1,000 |
| `esquivador` | Esquivador | mejor racha de obstáculos | 15 | 25 | 35 |
| `conquistador` | Conquistador | castillos | 1 | 5 | 20 |
| `constante` | Constante | mejor racha de días seguidos | 3 | 7 | 14 |

El nivel se calcula con los totales, así que no se guarda aparte.

**Días seguidos.** Una carrera en la fecha `f`:
- si la última carrera fue ayer, suma 1 a la racha;
- si fue hoy, no cambia nada;
- en cualquier otro caso, la racha vuelve a 1.

### 4. Premios cosméticos (sin valor real)
- **Colores:** `verde` (el de siempre), `azul`, `morado`, `rojo`, `rosa`, `dorado` y `noche`.
- **Estelas:** `fuego` (la de siempre), `estrellas`, `burbujas`, `hojas` y `arcoiris`.

Cómo se desbloquea cada premio:
- Explorador 🥉 → `color-azul`; Explorador 🥇 → `estela-arcoiris`.
- Coleccionista 🥉 → `estela-estrellas`; Coleccionista 🥇 → `color-dorado`.
- Esquivador 🥉 → `color-morado`.
- Conquistador 🥉 → `color-rojo`; Conquistador 🥇 → `color-noche`.
- Constante 🥉 → `estela-hojas`; Constante 🥈 → `color-rosa`.
- Primera misión diaria cumplida → `estela-burbujas`.

Los premios se guardan en `premios`, una lista que solo crece. El servidor exige que lo equipado esté desbloqueado,
igual que en Karts.

### 5. Forma de `datos` (validada en `server/progreso.ts`)
```
{ totales: { metros, monedas, esquivados, carreras, castillos, dobles },   // enteros ≥ 0 con tope
  mejorRacha: 0–999,
  dias: { ultimo: null | "AAAA-MM-DD", racha: 0–3660, mejor: 0–3660 },    // racha ≤ mejor; sin último, racha 0
  diaria: null | { fecha: "AAAA-MM-DD", avance: [3 × 0–100000] },
  cumplidas: 0–100000,                                                       // misiones diarias cumplidas en total
  premios: [ids de PREMIOS, sin repetir],
  equipo: { color, estela } }
```
Reglas de la validación:
- las llaves deben ser exactas: ni sobran ni faltan;
- las fechas deben ser reales;
- los topes de `totales` son 10 000 000 para metros, esquivados y dobles, y 1 000 000 para el resto.

El cliente pasa lo que lee por `normalizar` antes de usarlo. Si viene `null` o algo dañado, empieza de cero.

### 6. Integración con `juegos.html`
- **Catálogo.** `dragon-run` pasa a `cat: 'arcade'`. El juego ahora se pinta en `.arcade-caja`, la misma caja de Axo y
  Karts: alta en el celular y 16:10 en la computadora.
- **Avance.** Lo maneja un auxiliar nuevo, `canalProgreso(id, aJuego)`, que lee y guarda con la misma lógica de
  `jugarArcade`:
  - `PUT` encadenado;
  - un reintento ante `version_vieja` si el avance ya se había leído.

  No se refactoriza `jugarArcade` para no chocar con los cambios en paralelo de Axo y Karts. Queda anotado como
  duplicación a unificar después.
- **Mensajes del juego a la página:**
  - `{ juego: 'dragon-run', tipo: 'listo' }`;
  - `{ tipo: 'guardar', datos }`, que se manda antes del `fin`;
  - `{ fin: true, …, misiones: [textos] }`.
- **Mensajes de la página al juego:** `{ tipo: 'inicio', progreso, semilla, aviso }` y `{ tipo: 'guardado', ok }`.
- **Seguridad.** Solo se aceptan mensajes del iframe y del mismo origen, como antes. Los textos de misiones se escapan
  antes de entrar al resultado (`detalle` es HTML).
- **Pruebas.** `?arcadePrueba=1` abre el juego con `?prueba=1`. Eso expone `window.__dragonPrueba`
  (`fecha`, `misiones`, `cumplir`, `terminar` y `progreso`). Solo es para las E2E.
- **Sin servidor.** Si el juego se abre suelto, sin `juegos.html`, el avance va a `localStorage.dragonProgreso`.
- **Recargar.** Como los demás juegos de Arcade, que guardan su avance en el servidor, recargar ya no pide
  confirmación (`enCurso.foto = () => null`). La carrera a medias se pierde, pero las misiones ya guardadas no.

### 7. Pantallas a 390 px y movimiento reducido
- **Pantalla de misiones** (`#ovS`):
  - cubre todo el iframe (`position: fixed`) con letra en `rem`, no en `cqw`, para que se lea a 390 px;
  - tiene scroll propio y el botón JUGAR siempre visible abajo;
  - muestra las misiones del día con barra de avance, los logros con su medalla y los premios con 🔒 y una pista.
- **Aviso «¡Misión cumplida!».** Es un aviso del DOM arriba del juego, con `role="status"`. Aparece al cruzar una meta
  durante la carrera.
- **En el celular vertical**:
  - tocar cualquier parte fuera de los botones también hace saltar;
  - arriba del canvas 2:1 se pinta cielo y abajo tierra, con el recordatorio «👆 Toca en cualquier parte para
    saltar».
- **Con `prefers-reduced-motion`:**
  - no hay sacudida al chocar;
  - hay menos partículas;
  - el fondo del menú no se desplaza;
  - el aviso aparece sin animación.

## Risks / Trade-offs

- **Hacer trampa desde la consola.** Alguien podría editar el avance para ganar premios. Solo son cosméticos y el
  servidor limita forma y rangos. Los puntos del ranking siguen con su tope.
- **Dos pestañas.** Si dos pestañas juegan a la vez, gana la última escritura, igual que en Arcade.
- **Medianoche.** Una carrera que cruza la medianoche cuenta para la fecha en que terminó.
