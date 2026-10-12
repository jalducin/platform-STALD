## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/karts-controles-diseno` desde `origin/main` (tras `git fetch`)

## 1. Causa raíz del control

- [ ] 1.1 Capturas «antes» en `origin/main` (E2E `karts` y capturas sueltas en vertical, horizontal y escritorio)
- [ ] 1.2 Reproducir con toques reales (CDP `Input.dispatchTouchEvent`, `hasTouch`/`isMobile`) suelto y dentro de
  `juegos.html` a 390×844, 360×640 y 844×390; documentar la causa en `design.md`

## 2. Entrada táctil y joystick

- [ ] 2.1 Ayudante `tactil()` con *touch events* no pasivos por `identifier` y *pointer events* solo para
  mouse/pluma; `touchmove` sin desplazamiento durante la carrera; mandos visibles en cualquier aparato táctil
- [ ] 2.2 Modelo `entrada` analógico (teclado + joystick/sensor + botones) con el derrape cuantizado; reglas iguales
- [ ] 2.3 Joystick flotante (zona muerta, regreso al centro, abajo = freno) y botones DERRAPE, 🎁 y FRENO;
  layout que cabe desde 320 px en vertical y en horizontal

## 3. Sensor y selector

- [ ] 3.1 Sensor: `DeviceOrientationEvent` por orientación, calibración, «🎯 Centrar», sensibilidad, permiso con
  toque (iOS), espera de 2 s y regreso al joystick con aviso; `allow` del iframe en `juegos.html`
- [ ] 3.2 Selector en el menú (Joystick · Sensor · Botones) guardado en `localStorage`

## 4. Minimapa y diseño

- [ ] 4.1 `canvas#minimapa` siempre visible con todos los corredores (tú con borde, flecha y «TÚ»; rivales con
  color y número; fantasmas en sala), sin encimarse con los mandos
- [ ] 4.2 Sprites de karts pre-dibujados (llantas, alerón, casco, sombra, brillo, número) y partículas de humo y
  chispas por nivel
- [ ] 4.3 Pistas: texturas, orilla tipo piano, decoración por pista, meta a cuadros con arco
- [ ] 4.4 HUD pulido y resultados con podio (confeti solo sin `prefers-reduced-motion`)

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 5.1 `tests/e2e/e2e-karts.js`: joystick con toques reales (CDP) que gira el carro; multitáctil joystick +
  DERRAPE → turbo morado; botones ◀ con toque real; sensor con eventos `deviceorientation`; permiso negado y sin
  lecturas → joystick; preferencia guardada tras recargar; minimapa con 8 corredores y con fantasmas en sala;
  minimapa sin cruzarse con los mandos y mandos dentro de la pantalla a 390×844 vertical/horizontal y a 360×640;
  capturas en vertical, horizontal y escritorio. Se conservan los pasos actuales (copa, progreso, sala)

## 6. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 6.1 E2E `karts juegos plataformas partidas juegos-recarga revancha` con la copia de datos de prueba (la copia
  se descarta al terminar: estado restaurado)
- [ ] 6.2 Revisar las capturas nuevas y compararlas con las de «antes»
- [ ] 6.3 Reporte `openspec/changes/karts-controles-diseno/reports/2026-10-11-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 7.1 Servir los estáticos y abrir `juegos/karts.html` en Chromium móvil (vertical y horizontal) con toques
  reales: joystick, botones, sensor simulado, permiso negado, `prefers-reduced-motion`; medir cuadros por segundo
- [ ] 7.2 Tras el merge (usuario): probar en un Android y un iPhone reales el joystick y el sensor

## 8. Documentación (OBLIGATORIO)

- [ ] 8.1 `docs/frontend-standards.md` (Arcade: controles de karts, sensor, selector, minimapa, `allow` del iframe)
- [ ] 8.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-controles-diseno --strict`

## 9. Cierre

- [ ] 9.1 Commits en español; sin push, PR ni merge (los hace el usuario). Tras el merge: `openspec archive`
