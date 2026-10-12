# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: personajes-xalli
- Agente: Claude (Opus 5.5), rama `feature/personajes-xalli` (desde `origin/main` en `eae63e5`)

## Comandos ejecutados

- `npm install` en `tests/e2e`.
- TDD (rojo): `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 9139 --puerto-web 9149 plataformas karts`
  (el puerto 9049 pedido estaba ocupado por el servidor Deno de otro agente; se usaron 9139/9149).
- Suite requerida: `… correr.sh --datos <copia> --puerto-api 9139 --puerto-web 9149 plataformas karts mando dragon-run juegos`
- `npx -y deno test -A server/`
- `npx -y deno lint server/ juegos/personajes.js tests/e2e/lib/personajes.js`
- `npx -y @fission-ai/openspec@1.4.1 validate personajes-xalli --strict`
- Medición de fps con CPU ×4: script de Playwright (fuera del repo) con `Emulation.setCPUThrottlingRate` sobre los juegos
  sueltos servidos localmente, pantalla 2x, 390×844 y 844×390, con cada personaje (Karts con el piloto de prueba en la
  copa; Axo corriendo y saltando en el 1-1).

## Resultados de pruebas

- TDD, antes de implementar: `plataformas` FAIL (13 PASS; fallan el selector, «Xalli elegido», «Xalli camina» y se
  detiene al no existir `[data-personaje]`); `karts` FAIL (3 PASS; falla «🏁 Piloto» y se detiene).
- Después de implementar, suite requerida (fase `base`): 5 corridas, 5 PASS, 0 FAIL, 0 omitidas (~9 min).
  - `plataformas`: 75 PASS · `karts`: 158 PASS · `mando`: 64 PASS · `dragon-run`: 31 PASS · `juegos`: 31 PASS.
  - En una corrida aislada anterior, `karts` falló 1 vez en «acelera solo tras ¡YA!» y «escritorio: 60 cuadros por
    segundo» (40 fps) con la máquina cargada por otros agentes. Se comparó con `main` en el mismo momento: la versión
    de `main` hace exactamente lo mismo (el kart sin girar se sale a los ~2 s y baja a 138) y tiene las mismas caídas de
    fps; en las corridas siguientes, PASS.
- Deno `server/`: 462 pasaron, 0 fallaron, 6 omitidas. Lint: 93 archivos, sin problemas.
- `openspec validate personajes-xalli --strict`: válido.

### Lo nuevo que cubren las E2E

- Axo: selector con los 4 (nombre, título y retrato) y Xalli por omisión; el texto de la portada habla de Xalli y el
  título sigue siendo «Axo y los 12 mundos»; avance viejo (servidor, sin personaje) → Xalli; elegir a Yahui y recargar
  Juegos → Yahui elegido, en el mapa, en los 4 mundos y en la sala; el progreso guardado conserva sus 8 llaves.
  Suelto, con cada personaje: se dibuja (color de firma en su caja: Xalli 561 px, Itzae 208, Yahui 912,
  Xochiquetzal 222; branquias de Xalli = 0 en los demás), suelta su partícula, termina el 1-1 con puntos y sigue
  elegido tras recargar. Selector sin desbordarse a 320×640 y 844×390. Valor desconocido y `localStorage` bloqueado →
  Xalli sin errores; movimiento reducido → 0 partículas.
- Karts: «🏁 Piloto» con los 4 y Xalli por omisión; en la copa tu kart con Xalli y los 7 bots con Itzae, Yahui y
  Xochiquetzal; elegir a Itzae y recargar → Itzae y bots sin Itzae; en la sala, los 2 fantasmas con otros personajes;
  el progreso de karts conserva sus 5 llaves. Suelto, con cada personaje: rivales correctos, kart dibujado (color de
  carrocería en la caja de tu kart), carrera terminada con tabla de 8; estela del turbo (y 0 con movimiento reducido);
  selector a 320×640 y 844×390; valor desconocido → Xalli.

### Fps con CPU ×4

| Juego y tamaño | Xalli | Itzae | Yahui | Xochiquetzal |
| --- | --- | --- | --- | --- |
| Axo 390×844 | 57–60 | 60 | 60 | 60 |
| Axo 844×390 | 60 | 60 | 60 | 60 |
| Karts 390×844 | 46–60 (1.er s 22) | 44–60 | 58–60 | 49–60 (1.er s 35) |
| Karts 844×390 | 51–60 (1.er s 21) | 48–60 | 52–60 | 51–60 (1.er s 21) |

En Karts el primer segundo cae durante la cuenta regresiva, cuando se pre-dibujan los sprites de los 8 karts; en la
misma máquina y momento, `main` dio 43–60 (390×844) y 40–60 (1100×700). Sin CPU ×4, Karts a 1100×700: 56–60.

## Verificación de estado

- Antes: copia temporal del repo de datos creada por `correr.sh`; sin Postgres (no se toca ninguna tabla `stald_`).
- Después: `correr.sh` descarta la copia; la carpeta de datos original no cambia. La preferencia `arcade_personaje`
  solo vive en contextos de navegador desechables.
- Estado restaurado: Sí — nada que restaurar fuera de la copia temporal. El archivo temporal `juegos/karts-orig.html`
  (copia de `main` para comparar fps) se borró.

## Verificación manual (Step 5) — capturas revisadas contra la imagen de referencia

- Hoja de poses de perfil (`personajes-hoja-perfil.png`) y de pilotos (`karts-personajes-hoja.png`), capturas de cerca
  `plataformas-personaje-<id>-{quieto,camina,salta,portada,nivel}.png` y `karts-personaje-<id>[-carrera|-turbo].png`.
- Xalli: mismo ajolote y escala de Axo, branquias coral con halo, collar turquesa con jade, faja y diadema. Itzae:
  abanico de plumas turquesa/verde con disco solar dorado y el códice que brilla en la mano; túnica ocre. Yahui: orejas,
  rosetas, cola larga y penacho de quetzal; brazaletes de obsidiana. Xochiquetzal: corona de cempasúchil y flores
  magenta, máscara de madera con ojos turquesa, huipil bordado y niebla turquesa.
- **Corregido al revisar:** ojos de Yahui parecían lentes (contorno) → ojos ámbar sin contorno con ceja; retratos de
  los humanos se veían chicos en las tarjetas → retrato más grande; en Karts la cola de Yahui quedaba tapada por el
  alerón y las cabezas casi no salían → cabeza más alta y grande, cola hacia un costado.
- Casos de error: valor desconocido, `localStorage` bloqueado y movimiento reducido (cubiertos en la E2E).

## Resultado

- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente para el usuario: que el profe los vea en un celular real.
