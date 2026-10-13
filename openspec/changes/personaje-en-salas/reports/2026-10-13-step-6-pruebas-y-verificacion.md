# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-13
- Cambio: personaje-en-salas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/personaje_sala_test.ts` (primero en rojo: faltaba `server/personajes.ts`; luego en verde)
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `cd tests/calidad && npm run calidad` (antes y después del cambio)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9711 --puerto-web 9721 plataformas karts-vivo`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9711 --puerto-web 9721 karts karts-vivo plataformas partidas juegos categorias futbol-en-linea`
- `CHROME=… bash tests/e2e/correr.sh … karts-vivo` (repetición, ver «Incidencias»)
- curl contra un servidor local (puerto 9731) con una copia desechable de los datos (ver «Verificación manual»)

## Resultados de pruebas
- Dirigidas (`server/personaje_sala_test.ts`): 6 pasaron, 0 fallaron (misma lista que `juegos/personajes.js`;
  guardar en Karts y en Axo; id inválido y sala de otro juego → 400 `personaje_invalido`; sala empezada → 409
  `ya_empezo`; persona fuera de la sala entra con su personaje o 409 `sala_llena`).
- Servidor completo: 615 pasaron, 0 fallaron, 6 omitidas (las de Postgres sin variables). `deno lint`: 110 archivos
  sin avisos.
- Calidad: 317 avisos antes y 317 después (0 nuevos; 135 revisados con NOSONAR, sin cambio).
- E2E (corrida completa): juegos 31/31, categorias 49/49, partidas 15/15, plataformas 115/115, karts 211/211,
  futbol-en-linea 18/18, karts-vivo 37/38 (ver «Incidencias»). Primera corrida y repetición de karts-vivo: 38/38.
  - Pasos nuevos de karts-vivo: «🏁 Tu piloto» con los 8 y peso, Itzae marcado (el del modo individual); 4×2 sin
    desplazamiento a 390×844 y 844×390; cada quien ve Tona / Kinich / Yahui junto a Marisol / Angel / Laura;
    `localStorage` = tona, kinich, yahui; en la carrera cada quien corre con el suyo y los rivales llevan el suyo
    desde la salida y en vivo; el fantasma del respaldo usa un personaje que nadie eligió (yahui + xalli → itzae).
  - Pasos nuevos de plataformas: «🦎 Tu personaje» con Yahui marcado (elegido antes en el modo individual); elegir Xolo
    lo guarda en asiento, navegador y lista; el nivel de la sala arranca con Xolo; de vuelta al modo individual la
    portada trae a Xolo.
  - Rendimiento de Karts en vivo sin cambio: 60 fps sin límite y 59 con CPU ×4 con 8 karts; 86 mensajes/s.

## Verificación de estado
- Antes: copia del repo de datos en el scratchpad; Postgres de prueba no usado (sin `--pg`).
- Después: `correr.sh` trabaja sobre su propia copia (la original no cambia). Ninguna escritura en tablas `stald_`.
- Estado restaurado: Sí — la copia desechable del curl (`data-curl`) se borró y el servidor de 9731 se apagó.

## Verificación manual (Step 7) — el agente la ejecutó
- curl (invitados de prueba `cv-uno@example.com` y `cv-dos@example.com`, sin datos personales):
  - `{ personaje: "tona" }` en sala de karts → 200 `{ ok, codigo, personaje: "tona" }`
  - `{ personaje: "pikachu" }` → 400 `personaje_invalido`
  - otra persona fuera de la sala con `{ personaje: "kinich" }` → 200 (entra); `GET` de la sala trae `tona` y `kinich`
  - sala de `futbol` → 400 `personaje_invalido`; sala empezada → 409 `ya_empezo`; sin sesión → 400 `missing_email`
- Capturas revisadas (en `tests/e2e/salida/`): `karts-sala-espera-390.png`, `karts-sala-espera-844x390.png`,
  `karts-sala-espera-844x390-completa.png`, `karts-sala-carrera-390.png` (Tona propio, rival detrás),
  `karts-sala-carrera-844x390.png` (Kinich propio, Tona de Marisol adelante), `plataformas-390-sala-espera.png`,
  `plataformas-390-sala.png` (nivel 1-1 con Xolo). La cuadrícula 4×2 cabe sin desplazamiento; los nombres largos
  (Xochiquetzal) se recortan con «…» a 390 px y se ven completos a 844 px.

## Incidencias
- En la corrida completa, karts-vivo falló 1 paso que ya existía antes de este cambio: «el lugar de Angel coincide en
  las dos pantallas (± 1)» (6 vs 4) en la sala de 8 navegadores. No depende del personaje (es el orden que ve cada
  aparato con red simulada); pasó en la primera corrida y en la repetición (38/38). Se considera intermitente por la
  carga de 8 navegadores en la misma máquina.

## Resultado
- Estado Step 6: PASS
- Bloqueos: ninguno
