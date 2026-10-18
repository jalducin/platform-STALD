## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y rama `fix/karts-copa-sala-4-carreras` desde `origin/main`

## 1. Diagnóstico y pruebas que fallan (TDD)

- [x] 1.1 Pruebas Deno rojas en `server/karts_copa_sala_4_test.ts`: copa de 4 carreras con 2 personas + bots y una
      carrera perdida, reportes duplicados, quien no termina (NT por avance), cierre por los 30 s, podio solo al
      final y carrera suelta con plazo
- [x] 1.2 Causa confirmada escrita en design.md §1

## 2. Reglas compartidas (`juegos/karts-copa.js`)

- [x] 2.1 `PLAZO_MS` y `cierreCarrera` (todas reportaron, plazo de 30 s tras la primera llegada o límite)
- [x] 2.2 Calendario: todas las personas cuentan en cada carrera; `plazo` por carrera; `CARRERAS` = pistas de la copa
- [x] 2.3 Resultado con el avance de quien no terminó (orden de NT)

## 3. Servidor

- [x] 3.1 `server/karts_copa.ts`: reporte con `avance` opcional cuando `ms` es null
- [x] 3.2 `server/salas.ts` y `server/carreras.ts`: carrera suelta de Karts con plazo (`carrera_cerrada`, ranking)

## 4. Página y juego

- [x] 4.1 `juegos/app/arcade.js`: sin abandono automático por llegar tarde; mensaje `plazo` al juego; texto
      «⏱️ N s para terminar»; `avance` en el reporte; podio de la carrera suelta con la regla nueva
- [x] 4.2 `juegos/karts.html`: cuenta «⏱️ N s para terminar» en el HUD
- [x] 4.3 Subir `?v=` de los scripts cambiados

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 Ajustar `server/karts_copa_test.ts` y demás pruebas que asumían «esperados» o cierre solo por límite
- [x] 5.2 E2E (`tests/e2e/e2e-karts-vivo.js`): copa en sala de 4 carreras con 2 personas: 4 tablas entre carreras,
      un solo podio final; cuenta de 30 s tras la primera llegada (gancho de prueba para acortar el tiempo)

## 6. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 6.1 `npx -y deno test -A server/` y `deno lint`
- [x] 6.2 E2E: `karts-vivo karts-puntos partidas espectador` con el simulador de canal (datos en carpeta temporal)
- [x] 6.3 `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 6.4 Reporte en `openspec/changes/karts-copa-sala-4/reports/2026-10-18-step-6-pruebas-y-verificacion.md`

## 7. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 7.1 UI: la E2E recorre la copa completa en el navegador (simulador de canal) con capturas; casos de error
      (tiempo tardío `carrera_cerrada`, tiempo imposible `carrera_invalida`) cubiertos en Deno contra el servidor

## 8. Documentación (OBLIGATORIO)

- [x] 8.1 Comentario de cabecera de `juegos/karts-copa.js` con la regla nueva y `docs/` afectados

## 9. Publicación

- [ ] 9.1 Merge de `origin/main`, PR, checks verdes, merge y verificación en producción
