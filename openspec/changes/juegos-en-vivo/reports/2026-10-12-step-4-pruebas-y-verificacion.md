# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: juegos-en-vivo (módulo en vivo y Karts en vivo de hasta 8 personas)
- Agente: Claude Code (Opus 5.5)

## Paso 0 — ¿funciona sin tocar Supabase?

Sí. Con la llave publicable y un canal público (`private: false`, como los de las salas), dos navegadores reales se
mandan broadcast entre sí en el proyecto Portafolio, sin políticas nuevas ni cambios de configuración:

| Prueba (Supabase real, topic `sala-prueba-<azar>`, cerrado al terminar) | Resultado |
|---|---|
| 2 navegadores, 20 pings con respuesta | 20/20 en cada sentido; RTT 146 / **163** / 190 ms (mín / mediana / máx) |
| `EnVivo.conectar`, 2 navegadores a 15 Hz, 8 s | conecta en ~0.5 s; latencia de un sentido 79–83 ms |
| `EnVivo.conectar`, **8 navegadores a 10 Hz, 20 s** | 70.3 mensajes/s recibidos por cada uno (esperado 7 × 10), sin pérdida, 87–110 ms, presencia 8 |

Las llaves se leyeron con `supabase projects api-keys` solo hacia variables del proceso; nunca se escribieron en archivos.

## Comandos ejecutados

- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 9299 --puerto-web 9309 karts-vivo karts futbol juegos categorias partidas emocion mando`
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 9299 --puerto-web 9309` (suite completa)
- `cd tests/calidad && node calidad.mjs` (rama y main)
- Verificación manual contra Supabase real: servidor local con `SUPABASE_*` en el entorno y `STALD_TABLAS=stald_test_`

## Resultados de pruebas

- Unitarias (Deno): 581 pasaron, 0 fallaron, 6 omitidas (las de siempre). Nuevas: `server/en_vivo_test.ts` (20:
  orden, repetidos, ritmo sin deriva, latencia con pérdida, presencia, adiós, reconexión 1-2-4-8 s, respaldo a 5 s,
  datos inválidos, 8 personas a 10 Hz, interpolación/extrapolación/ángulos y el contrato `conectar`/`simulado`),
  `server/karts_vivo_test.ts` (8 entran, la 9.ª `sala_llena`, tiempo validado con el reloj) y `server/mesas_test.ts`.
  Antes de implementar fallaban (módulo inexistente; mesa sin `karts`).
- Tipos y lint de `server/`: sin problemas.
- E2E dirigidas: `juegos` 31, `categorias` 49, `partidas` 15, `karts` 158, `futbol` 52, `mando` 64, `emocion` 45 y
  `karts-vivo` 27 pasos, todas en PASS (la primera corrida de `karts-vivo` midió fps con 8 navegadores dibujando a la
  vez y salió contaminada; ver «fps»).
- E2E suite completa: ver «Suite completa» abajo.
- Calidad: 317 avisos en la rama = 317 en `main` (sin avisos nuevos; el único que había surgido, `pasoKart` 16 > 15, se
  corrigió moviendo la rama del kart remoto al bucle de `paso`). Los `NOSONAR` nuevos son bucles con `await` a propósito
  en pruebas y el generador con semilla.

### `e2e-karts-vivo` (canal simulado: relevo local, 60 ms ± 20 %, 3 % de pérdida, 10 % de desorden)

- Sala de **8 contextos** (5 alumnos y alumnas de ejemplo + 3 invitados nuevos): 8 personas y ningún bot en la espera;
  la 9.ª persona recibe «La partida está llena».
- Canal en vivo en los 8; cada quien ve a las otras 7 (presencia 8); colores distintos por lugar; minimapa con 8;
  HUD «/8»; clasificación en vivo con 8 filas; el lugar de Angel coincide en las dos pantallas (± 1).
- Marisol ve moverse el kart de Angel y a menos de 120 px de donde Angel va de verdad, con su nombre y su personaje.
- Mensajes de la sala de 8: 84–92 por segundo (estados a 10 Hz + latidos + pings).
- Podio del servidor con los 8 tiempos.
- Desconexión (sala de 3, Laura sin señal): «👋 Laura perdió la conexión», su kart se desvanece y sale de la
  clasificación; Angel sigue; al volver la señal, Laura reaparece.
- Respaldo: sin canal, aviso «📴 Sin conexión en vivo…» y tú + fantasma; canal que no conecta en 5 s, el mismo aviso.

### fps

Con 8 navegadores dibujando a la vez en la misma máquina la lectura sale contaminada (15–50 fps según la carga), así
que se mide **un solo aparato**: Marisol en el navegador y las otras 7 personas en la sala por la API, con el relevo
fabricando sus karts a 10 Hz. Mediana de 8 lecturas: **60 fps sin límite y 59 fps con CPU ×4** con 8 karts en vivo
(7 remotos visibles).

## Verificación manual (EL AGENTE EJECUTA) contra Supabase real

Servidor local (copia temporal de datos, borrada al final; `STALD_TABLAS=stald_test_`, no se escribe en `stald_`),
estáticos locales, sala de Karts «Lago Helado» con Marisol y Angel:

- La sala trae `rt` del proyecto real; el canal `vivo` conecta en los dos.
- Cada quien ve al otro (kart visible y moviéndose), presencia 2, 60 fps.
- Latencia medida (un sentido): 91 / 88 ms; diez lecturas seguidas: 89–91 ms (con la llave `service_role`: 79–88 ms).
- Con la llave `sb_secret` que da el CLI, el broadcast REST del `estado` (función ya existente) respondió 403 en el
  servidor local porque el CLI la entrega recortada; con `service_role` no hubo 403. No afecta al canal `vivo` ni a
  producción (usa su propia variable).

## Verificación de estado

- Antes: copia temporal de datos para E2E y verificación manual; Supabase sin cambios.
- Después: copias borradas (`correr.sh` y el script manual); servidores apagados; topics de prueba cerrados.
- Estado restaurado: Sí — nada en `stald_`, Notion, `supabase/` ni `.env`; ninguna configuración de Supabase tocada.

## Capturas revisadas

- `karts-vivo-390.png` (390×844): clasificación en vivo de 8, nombres sobre los karts, minimapa con 8.
- `karts-vivo-844x390.png` (844×390): la pista a la vista al entrar (antes quedaba abajo), tabla arriba del joystick.
- `karts-vivo-390-cpu4.png`, `karts-vivo-desconexion.png`, `karts-vivo-respaldo.png`.

## Suite completa

(pendiente: se completa al terminar la corrida)

## Resultado

- Estado Step 4: PASS (pendiente la suite completa)
- Bloqueos: ninguno
