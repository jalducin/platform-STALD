## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/juegos-carga-perezosa` desde `main` actualizado (con `navegacion-mejoras`)

## 1. Línea base (medir antes de cambiar)

- [x] 1.1 E2E `juegos-carga` con `MEDIR=1` contra el código de `main`: archivos, KB y menú usable en celular 360 y PC
  1280 con 4G simulada y caché vacía (servidor local, copia temporal de datos, puertos 9031/9032)
- [x] 1.2 Producción, solo lectura y sin sesión: la misma medición contra GitHub Pages (`juegos.html` y `?registro=1`)

## 2. Implementación

- [x] 2.1 `juegos/app/cargador.js` (nuevo): `ARCHIVOS_JUEGO` con `?v=`, `PAQUETES`, `PAQUETE_DE_JUEGO`, `cargarPaquete`
  (preload + ejecución en orden + alto en la primera falla + promesa por archivo), `conPaquete`, `abrirJuego` y el
  aviso con «Reintentar»; CSS en la misma cascada de antes
- [x] 2.2 Catálogo: tarjetas de Clásicos rápidos y Tablero a `JUEGOS` (`menu.js`); `ClasicosRapidosUI.jugar(id)`;
  `tablero-ui.js` toma el título de `juegoPorId`; `BOTS`/`BOT_EXTRA` a `nucleo.js`
- [x] 2.3 Entradas: `iniciar()` (sala, espectador, sala guardada, revancha y reanudar con `cargarPaquete('todo')`),
  `pantallaHub('partidas')`, «👥 En vivo · Salas», clic de tarjetas (`abrirJuego`), guarda de la sala en
  `arranque.js` y «📖 Cómo se juega» sin `Object.assign` al cargar
- [x] 2.4 `juegos.html`: solo el núcleo (2 CSS y 10 JS) y `?v=` de los archivos cambiados (núcleo en `juegos.html`,
  perezosos en `ARCHIVOS_JUEGO`)

## 3. Verificación (OBLIGATORIO)

- [x] 3.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `juegos-carga` (topes N y T fijados con la
  medición) registrada en `tests/e2e/correr.sh`; E2E que evalúan motores recién abierta la página cargan antes su
  paquete
- [x] 3.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y toda la E2E de Juegos (fase `base`: juegos,
  categorías, juegos-diseno, karts, karts-vivo, futbolito, salas, espectador, revancha, brigada, clásicos, plataformas,
  mando, peticiones, navegacion-dispositivos, …) con puertos 9031/9032 y copia temporal de datos (sin tablas
  `stald_*`); las fallas por fps se repiten solas; reporte
  `openspec/changes/juegos-carga-perezosa/reports/2026-10-22-step-3.2-pruebas-y-verificacion.md`
- [x] 3.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): con Playwright y 4G, abrir el menú, un juego por
  paquete, Partidas, `?sala=` y `&ver=1`, `#cat=`, `?registro=1`, recarga en sala y error de red con «Reintentar»;
  medición después (celular y PC) en el reporte
- [x] 3.4 Actualizar documentación técnica (OBLIGATORIO): `docs/frontend-standards.md` (estructura de `juegos/app/`,
  paquetes y `?v=`), `docs/pruebas.md` (E2E nueva) y nota en `openspec/changes/navegacion-rendimiento/proposal.md`
- [x] 3.5 `openspec validate juegos-carga-perezosa --strict`, `verificador-pruebas` y `revisor-solo-lectura`; merge de
  `main` antes del PR
- [x] 3.6 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): archivos al abrir `juegos.html`
  (sin sesión, celular y PC con 4G), abrir un juego y una sala; todo con 200

## 4. Cierre

- [ ] 4.1 `openspec archive juegos-carga-perezosa` (consolida los deltas en `openspec/specs/`)
