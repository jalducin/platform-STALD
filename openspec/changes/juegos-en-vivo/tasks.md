## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-en-vivo` desde `origin/main`
- [x] 0.2 Paso 0: broadcast de navegador a navegador contra el Supabase real con la llave publicable (sin cambios en
  Supabase): 20/20 mensajes, RTT mediana 163 ms; topic `sala-prueba-<azar>` cerrado al terminar

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/en_vivo_test.ts`: sobre y secuencias, fuera de orden, repetidos, ritmo con coalescencia, latencia
  con pérdida, presencia y desconexión, reconexión con espera creciente, respaldo a 5 s, miembros, 8 personas,
  interpolación, extrapolación acotada, ángulos y el contrato `EnVivo.conectar` / `EnVivo.simulado`
- [x] 1.2 `server/mesas_test.ts` y `server/karts_vivo_test.ts`: mesa de Karts de 8 con 3 asientos (1+2, 2+1, 3+0,
  8+0), la 9.ª persona `sala_llena` y el tiempo validado con el reloj
- [x] 1.3 `tests/e2e/e2e-karts-vivo.js` (8 contextos, canal simulado con `tests/e2e/lib/vivo-relevo.js`): ver el kart del
  otro moverse y cerca de su posición real, nombre y personaje, minimapa, clasificación en vivo, mensajes/s, fps con
  CPU ×4, podio del servidor con 8 tiempos, desconexión que desvanece, respaldo sin canal y canal que no conecta;
  capturas 390×844 y 844×390
- [x] 1.4 Correr las pruebas nuevas y registrar que fallan (módulo inexistente; mesa sin `karts`)

## 2. Implementación

- [x] 2.1 `juegos/en-vivo.js`: motor, contrato `conectar`, `simulado`, `interpolador`, `transporteSupabase`,
  `transporteMarco`, `puente` y `redSimulada`; nota del Paso 0 en el encabezado
- [x] 2.2 `juegos/mesas.js` y `server/salas.ts`: `karts: { max: 8, asientos: 3, min: 1 }`
- [x] 2.3 `juegos/app/salas.js`: `prepararVivo` (canal de la sala con `vivo`, doble de prueba con `vivoSimulado=1`)
- [x] 2.4 `juegos/app/arcade.js`: `inicio` de Karts con `yo`, `humanos` y `vivo`; puente filtrado por participantes;
  en horizontal, la pista a la vista
- [x] 2.5 `juegos/karts.html`: karts remotos interpolados (personaje, nombre, número y color por lugar), minimapa,
  empuje local, clasificación en vivo, desvanecer al desconectarse, avisos de respaldo y reconexión; ganchos de prueba
- [x] 2.6 `juegos.html`: cargar `en-vivo.js` y subir `?v=`
- [x] 2.7 Tras integrar `karts-pistas-mesoamericanas`: las 4 pistas nuevas también en sala (`sala: true` y
  `MAPAS_SALA`), prueba del servidor, paso E2E en Sacbé de Chichén Itzá y spec de ese cambio ajustado

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `e2e-karts.js` (sala con 1 persona + 2 fantasmas igual que antes), `e2e-partidas.js`, `e2e-categorias.js`,
  `server/salas_test.ts` y `server/carreras_test.ts` siguen válidas sin cambios de expectativa

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`
- [x] 4.2 E2E dirigidas: `karts-vivo karts futbol juegos categorias partidas emocion mando`; al final, la suite completa
  (la copia temporal de datos se descarta: estado restaurado; nunca se escribe en tablas `stald_`)
- [x] 4.3 `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 4.4 Reporte `openspec/changes/juegos-en-vivo/reports/2026-10-12-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Supabase real, carga: 8 navegadores a 10 Hz 20 s en un topic de prueba con `EnVivo.conectar` (70.3
  mensajes/s recibidos por cada uno, sin pérdida, ≈ 90 ms); canales cerrados al terminar
- [x] 5.2 Supabase real, sala local: servidor local con las variables en el entorno (nunca en archivos) y
  `STALD_TABLAS=stald_test_`; sala de Karts con 2 contextos, ver al otro y medir la latencia; copia de datos temporal
  borrada y servidores apagados
- [x] 5.3 fps con 8 karts en vivo y CPU ×4; revisar las capturas a 390×844 y 844×390
- [x] 5.4 Casos de error: mensaje de un id ajeno (unitaria), canal que no conecta (respaldo), compañero que se va

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (juego en vivo y Karts), `docs/backend-standards.md` (mesa de Karts) y
  `docs/pruebas.md` (relevo simulado y `e2e-karts-vivo`)
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate juegos-en-vivo --strict`

## 7. Publicación

- [ ] 7.1 Merge de `origin/main`, `?v=` arriba de main, PR en español, `gh pr checks --watch`, `gh pr merge --merge`,
  borrar la rama remota y verificar producción

## 8. Cierre

- [ ] 8.1 Tras la prueba del profe con varios celulares: `openspec archive juegos-en-vivo` (no antes)

Nota: el 1 vs 1 en línea de Fútbol Estelar lo lleva otro agente en su propio cambio, sobre el contrato de
`juegos/en-vivo.js` (design.md §5).
