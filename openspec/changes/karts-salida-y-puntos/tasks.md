## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear `fix/karts-salida-y-puntos` desde `origin/main` (nombre pedido por el profe para este arreglo)

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/karts_salida_puntos_test.ts`: sala de 2 (A gana con 0 monedas, B 2.º con 10): A 1.º con más puntos;
  puntos inflados → los del servidor; 409 `carrera_en_curso`; no terminó después de los que terminaron (por avance);
  `puntosLugar` estrictamente decreciente; copa: ranking en el orden de la tabla (1,1,3,3 / 3,3,1,1 / 2,2,2,2);
  cuenta regresiva de 8 s en Karts y `reloj` en `GET /sala`
- [x] 1.2 `server/karts_parrilla_test.ts`: en las 8 pistas, casillas a ≤ 200 px de la meta, filas y lados constantes,
  sobre el camino y lejos de las mecánicas
- [x] 1.3 `server/reloj_sala_test.ts`: intersección de muestras, aviso de Realtime, muestras lentas, salto de reloj
- [x] 1.4 `tests/e2e/e2e-karts-vivo.js` (`salidaYPodio`): 2 personas en vivo, a una le llegan las respuestas 1.5 s
  tarde: reloj ≈ 0, salidas a < 150 ms, juntas en la parrilla (< 60 px) y quien llega primero (0.8 s antes) es 1.º con
  más puntos; sala de 3 en Teotihuacan con casillas pegadas e iguales en las 3 pantallas. En rojo antes del arreglo
  (Angel, que cruzó 0.8 s después, quedaba 1.º con 500 contra 425)

## 2. Reglas compartidas y servidor

- [x] 2.1 `juegos/reloj-sala.js` (nuevo) y `juegos/arcade.js` (`parrilla`, `podioCarrera`, `puntosLugar`)
- [x] 2.2 `juegos/karts-copa.js`: ranking por lugar final
- [x] 2.3 `server/carreras.ts` (`avance`, `rankingCarreraSala`), `server/salas.ts` (`reloj` en la vista, 8 s de cuenta
  en Karts), `server/juegos.ts` (`puntosDeSala`: puntos del servidor y 409 `carrera_en_curso`)

## 3. Página e iframe

- [x] 3.1 `juegos/app/salas.js` (reloj común, reintento de `carrera_en_curso`), `juegos/app/arcade.js` (podio con
  `podioCarrera`, solo con los tiempos del servidor, `avance`, `salidaLocal`); `juegos.html` carga
  `juegos/reloj-sala.js` y sube `?v=`
- [x] 3.2 `juegos/karts.html`: parrilla con `Arcade.parrilla` (karts y casillas), respaldo con tú adelante, `avance`
  en `meta`, salida fijada antes de pintar la pista (`salidaLocal`), presentes visibles en la cuenta;
  `juegos/plataformas.html` usa `salidaLocal`; `?v=` de `arcade.js` en `karts.html` y `plataformas.html`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `server/carreras_test.ts` y `server/karts_vivo_test.ts` (8 s de cuenta); `server/karts_copa_test.ts` sigue
  igual (compara con la tabla del servidor); `tests/e2e/correr.sh` (tiempo de `karts-vivo`)

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/`, `deno lint`, `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 5.2 E2E: `karts karts-vivo partidas juegos` (+ `plataformas emocion mando`) con datos copiados (nada en tablas `stald_`)
- [x] 5.3 Reporte en `openspec/changes/karts-salida-y-puntos/reports/2026-10-14-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 6.1 Capturas de la parrilla en sala (390×844 y 844×390) en una pista grande (Volcán) y una mesoamericana
  (Teotihuacan), y del podio; revisión visual
- [ ] 6.2 Producción tras el merge: `GET /salud` y versión publicada en Pages (`reloj-sala.js`, `?v=`)

## 7. Documentación técnica (OBLIGATORIO)

- [x] 7.1 `docs/backend-standards.md` (`reloj`, `avance`, puntos del servidor, 409 `carrera_en_curso`, 8 s),
  `docs/data-model.md` (`avance` en `carrera`), `docs/frontend-standards.md` (reloj común, `salidaLocal`, parrilla);
  nota en el spec y el design del cambio `karts-copa-en-sala` sobre el ranking por lugar final

## 8. Publicación

- [ ] 8.1 PR en español, `gh pr checks --watch` hasta que terminen todos, merge, borrar la rama remota y verificar en
  producción. Sin `openspec archive`.
