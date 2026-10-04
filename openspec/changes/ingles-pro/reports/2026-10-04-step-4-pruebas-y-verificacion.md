# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: ingles-pro (Sprint 2)
- Agente: Claude Code (rama `feature/ingles-pro`, worktree aislado)

## Comandos ejecutados

- `npx -y deno test -A server/resumen_test.ts` (TDD: primero falló por falta de `calcularRacha` y `server/resumen.ts`)
- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- Servidor local: API Deno en el puerto 8797 (`DATA_DIR` con una copia de los datos, `ROWS_FIXTURE`,
  `PERMITIR_HOY=1`) y estáticos en el 8775 (`python -m http.server`).
- Postgres de prueba: tablas `stald_test_*` (nunca `stald_`). Antes de cada bloque: limpiar, copiar los datos,
  `herramientas/migrar-ingles.ts --datos <copia>` y crear `grupo-1`. La llave de servicio solo vivió en variables del
  proceso.
- E2E (Playwright, scripts en el scratchpad `s2/`, copias ajustadas de los originales):
  `e2e-alta-alumnos`, `e2e-inicio-lunes`, `e2e-segunda-oportunidad`, `e2e-pronunciacion`, `e2e-profe-grupo`,
  `e2e-ruta-profe`, `e2e-profe-diseno`, `e2e-grupos` y el nuevo `e2e-ingles-pro`.
- Lighthouse local (Accesibilidad y Buenas prácticas) con sesión iniciada (alumna en celular y admin en escritorio).

## Resultados de pruebas

- Dirigidas (`server/resumen_test.ts`): 10 pasaron, 0 fallaron (racha: hoy, ayer, huecos, repetidos, cruce de mes,
  fechas futuras y hora de CDMX; resumen: solo admin, celdas por estado, profe fuera, indicadores, prórroga, filtro y
  calendario por grupo, una consulta por columna con `PgStore`; prórroga: dar, quitar, permisos y validación).
- Suite completa del servidor: 180 pasaron, 0 fallaron, 6 omitidas. `deno check` y `deno lint` sin errores.
- E2E con Postgres de prueba (todas en verde):

| E2E | PASS | FAIL | Ajuste a la navegación nueva |
|---|---|---|---|
| e2e-alta-alumnos | 11 | 0 | abre `#alumnos`; la tarjeta ya viene abierta |
| e2e-inicio-lunes | 6 | 0 | abre `#alumnos` |
| e2e-segunda-oportunidad | 8 | 0 | abre `#semana`; «Ver todas las preguntas» en celular |
| e2e-pronunciacion | 11 | 0 | «Ver todas las preguntas» en celular |
| e2e-profe-grupo | 7 | 0 | «Ver todas»; la vista del grupo abre `#resultados` |
| e2e-ruta-profe | 15 | 0 | «Ver todas»; la vista del grupo abre `#alumnos` |
| e2e-profe-diseno | 11 | 0 | sin cambios |
| e2e-grupos | 11 | 0 | abre `#grupos` y `#alumnos`; tarjetas abiertas |
| e2e-ingles-pro (nuevo) | 32 | 0 | — |

- `e2e-ingles-pro` cubre: anillo, racha igual a la del servidor, nivel, «Próxima clase» con cuenta regresiva
  («Empieza en 1 h 0 min» el sábado 9:00 para «Sáb 10:00») y botón al Meet de su grupo, «Para hoy», insignias, barra
  inferior fija con 5 secciones, botones ≥ 44 px, «⭐ Resultados» + Atrás → «🏠 Inicio», filtro por día, modo oscuro
  (desde Perfil y del sistema), reproductor con una pregunta por pantalla y atajos (1 y Enter, envío con Enter),
  barra de progreso al 100 %, resultado con anillo y barras por tema, racha que sube al entregar, menú lateral de
  9 secciones, indicadores, selector de grupo («Sábado A1» → solo Marisol en el mapa), celdas atrasadas, cajón con
  prórroga dada y quitada (verificada en la API de la alumna), cierre con Esc, barra del admin en celular con «☰ Más»
  y sin desplazamiento horizontal a 390 px.
- Lighthouse (local): alumna (celular) Accesibilidad 100 · Buenas prácticas 100; admin (escritorio) Accesibilidad 100 ·
  Buenas prácticas 96. Lo único observado en el admin es `errors-in-console`: el 503 `sin_base` de `/ingles/grupos`
  en el modo sin Postgres (comportamiento existente desde `ingles-grupos`; con la base migrada no aparece).
- Capturas antes y después (celular y escritorio, alumna y admin) y de cada paso del E2E: `scratchpad/s2/*.png`
  (`antes-*.png`, `despues-*.png`, `pro-*.png`).

## Verificación de estado

- Antes: `stald_test_docs`, `stald_test_grupos` y `stald_test_inscripciones` vacías (0 / 0 / 0).
- Durante: cada bloque partió de una copia limpia de los datos (`scratchpad/s2/data-pg`) y tablas recién migradas.
- Después: `docs=0 grupos=0 inscripciones=0`. Las prórrogas de prueba se escribieron en la copia en memoria
  (`DATA_DIR`) y se quitaron en el mismo E2E.
- Estado restaurado: Sí. No se tocaron las tablas `stald_`, el repo de datos ni producción. Servidores 8797 y 8775
  apagados al terminar.

## Resultado

- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente para quien integra: el paso 5.1 (revisión en producción, solo lectura) se hace después
  del merge y el despliegue.
