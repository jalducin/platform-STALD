# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-21
- Cambio: secundaria-mis-clases
- Agente: Claude Code (Opus 5.5); suite completa con el subagente `verificador-pruebas`

## Comandos ejecutados
- `npx -y deno test -A server/secundaria_clases_test.ts server/secundaria_test.ts server/profe_test.ts server/semana_test.ts`
- `npx -y deno test -A server/` (subagente `verificador-pruebas`)
- `npx -y deno check server/main.ts server/validar_semana.ts server/secundaria_clases_test.ts` · `npx -y deno lint server/`
- `npx -y deno run --allow-read server/validar_semana.ts <copia> 2026-10-05 --secundaria` y `… 2026-10-19 --secundaria`
- `npx -y deno run --allow-read server/validar_semana.ts tests/fixtures/datos 2026-10-26 --secundaria`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 8891 --puerto-web 8892 --hoy 2026-10-27 secundaria-clases`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 8891 --puerto-web 8892 examen-secundaria secundaria-clases autoguardado`
- Verificación manual con curl contra un servidor local (puerto 8893, `HOY_FIJO=2026-10-27`)

## Resultados de pruebas
- Dirigidas: 44 pasaron, 0 fallaron (8 nuevas en `server/secundaria_clases_test.ts`, primero en rojo: 6 fallaban)
- Suite completa: 906 pasaron, 0 fallaron, 6 omitidas (las que necesitan `DATA_DIR`)
- check y lint: sin errores (145 archivos)
- Validador `--secundaria` con datos reales: 2026-10-05 → 0 errores, 0 avisos; 2026-10-19 → 0 errores, 4 avisos
  (banco corto de los repasos; no bloquean); fixture 2026-10-26 → 0 errores, 0 avisos
- CLI: bandera desconocida → código 2; semana inexistente → código 1
- E2E `secundaria-clases` (hoy 2026-10-27): PASS 26/26 (Hoy con 2 clases, Matemáticas explícita y Ciencias deducida,
  colores distintos, 7 días de Lunes 26 a Domingo 1, horario de 7 días, 1 columna y sin scroll a 360 px en claro y
  oscuro, 7 columnas en escritorio, la clase de hoy abre)
- E2E con hoy por omisión (2026-10-04): `examen-secundaria` PASS 11/11, `autoguardado` PASS 29/29,
  `secundaria-clases` OMIT (necesita `--hoy 2026-10-27`)
- Capturas revisadas: `tests/e2e/salida/secundaria-clases-hoy.png`, `secundaria-clases-semana.png`,
  `secundaria-horario-360.png`, `secundaria-horario-360-oscuro.png`, `secundaria-horario-escritorio.png`,
  `secundaria-lista.png`. En la primera vuelta el horario de escritorio partía palabras («Matemát icas») y el chip
  «hoy» quedaba en vertical; se corrigió con guiones (`hyphens: auto`) y un encabezado que se acomoda en dos líneas.

## Revisión `revisor-solo-lectura` (atendida)
- Materia deducida por subcadena («Partes» → Artes): ahora por palabra completa (`materiaConocida`); paso nuevo en la
  E2E. `secundaria-clases` repetida: PASS 27/27. `secundaria.js?v=3`.
- La spec viva decía «📝 Exámenes»: la delta agrega `## MODIFIED` del requisito «Exámenes de Secundaria».

## Verificación manual (curl, servidor local, hoy 2026-10-27)
- Admin: 200, 22 elementos, 13 con `materia`
- Alumna de Secundaria del fixture: 200, 17 elementos, 0 ajenos; hoy: «Matemáticas» y una sin `materia` (se deduce en la vista)
- Correo sin Secundaria: 403 `sin_acceso`; sin sesión ni correo: 401; exclusivo ajeno por id: 404
- `/ingles/actividades` (admin): 200, sin cambios

## Verificación de estado
- Antes: repo de datos real sin tocar; las pruebas usan copias temporales (`correr.sh` copia sin `.git`; la manual usó
  una carpeta aparte en el scratchpad)
- Después: copia original sin cambios; ningún push de datos; ninguna escritura en tablas `stald_` (sin `--pg`)
- Estado restaurado: Sí — servidores apagados y puertos 8891/8892/8893 libres

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
