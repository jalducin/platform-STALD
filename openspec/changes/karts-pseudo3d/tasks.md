## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/karts-pseudo3d` desde `origin/main` (tras `git fetch`)

## 1. Diagnóstico

- [x] 1.1 Playwright móvil (`hasTouch`, `isMobile`) dentro de `juegos.html` a 360×740, 390×844 y 844×390 y suelto a
  390×844: marco, área lógica, pista visible por delante, velocidad sin girar, fps con CPU ×4 y capturas; documentar
  en `design.md` qué fallaba

## 2. Vista pseudo-3D

- [x] 2.1 Textura del suelo por pista (franjas del pasto, piano, asfalto, meta, lava) con tres niveles y render
  Mode-7 por filas en un búfer de máx. 400 px
- [x] 2.2 Cámara detrás del carro (`seguirCamara`, `ponerCamara`, `proyectar`) calculada desde `x`, `y` y `ang`
- [x] 2.3 Panorama de 360° por tema (cielo, sol o estrellas, nubes, montañas, volcán, cumbres, mesetas) sin costuras
- [x] 2.4 Escenario por pista como sprites (árboles, cactus, pinos, rocas, gradas, llantas, señales de curva), monedas,
  cajas, objetos, arco de META y partículas proyectadas, ordenados por profundidad con bruma
- [x] 2.5 Carros 3D (modelo de cajas, 32 vistas, número en el alerón), tu carro encima, inclinación y vibración
  (sin ellas con movimiento reducido); portada del menú en 3D
- [x] 2.6 Minimapa con «TÚ» siempre dentro del mapa

## 3. Controles y entrada

- [x] 3.1 Capa de acciones (`acel`, `freno`, `izq`, `der`, `derrape`, `item`, `pausa` + eje) y
  `window.KartsEntrada.registrar` para un mando futuro, sin depender de `juegos/mando.js`
- [x] 3.2 Botones ⬅ ➡ por omisión; DERRAPE, 🎁, FRENO y ACELERAR (con «Con botón»); selector «Acelerar»; sensor que
  falla regresa a Botones; layout desde 320 px en vertical y horizontal
- [x] 3.3 Teclado: flechas/WASD (↑ acelera, ↓ frena), ESPACIO derrape, E/Shift ítem, P/Esc pausa; turbo de salida con
  ACELERAR o DERRAPE
- [x] 3.4 Tutorial de 3 s al empezar y aviso «¡Vas al revés!»
- [x] 3.5 `juegos.html`: marco de Arcade a casi toda la altura en horizontal; menú desplazable (`safe center`)

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `tests/e2e/e2e-karts.js`: vista 3D (horizonte y sprites), botones ⬅ ➡ con toques reales que giran el carro y
  la cámara, multitáctil ⬅ + DERRAPE → morado, ACELERAR (sin él no avanza; con él sí), joystick y preferencias tras
  recargar, teclado (→, A, ↓) con cámara, vuelta completa con el piloto de prueba, tutorial, 320×640, horizontal
  dentro de Juegos a casi toda la altura, sensor que regresa a Botones; se conservan copa, progreso y sala

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 E2E `karts juegos plataformas revancha` con la copia de datos de prueba (`correr.sh` trabaja sobre una copia
  temporal y la borra: estado restaurado)
- [x] 5.2 Revisar las capturas (vertical, horizontal, escritorio, 320 px, sala, joystick)
- [x] 5.3 Reporte `openspec/changes/karts-pseudo3d/reports/2026-10-11-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 `juegos/karts.html` suelto en Chromium móvil (390×844, 360×740, 844×390) y escritorio con el piloto de
  prueba: capturas y fps con CPU ×4
- [ ] 6.2 Tras el merge (usuario): probar en un Android y un iPhone reales

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md` (vista pseudo-3D, controles por omisión, capa de acciones, marco en horizontal)
- [x] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-pseudo3d --strict`

## 8. Cierre

- [ ] 8.1 Commits en español; sin push, PR ni merge (los hace el usuario). Archivar después de `karts-controles-diseno`
