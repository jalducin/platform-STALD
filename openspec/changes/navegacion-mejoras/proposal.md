## Why

La auditoría de navegación (cambio `navegacion-dispositivos`, PR #245 y #246; reportes en
`openspec/changes/navegacion-dispositivos/reports/`) dejó recomendaciones pendientes. El profe pidió (2026-10-22)
implementar las chicas, en PRs pequeños y en este orden:

1. **Misión principal de Secundaria.** El Inicio de la alumna muestra «🔒 Abre el mié 28» (una clase que aún no abre)
   aunque tenga clases atrasadas o abiertas por adelantado: la regla actual solo mira «lo de hoy sin hacer» y, si no hay,
   «la próxima por fecha», sin importar si está abierta ni lo atrasado.
2. **Profe en celular.** «📥 Entregas» vive en «☰ Más»: cada revisión cuesta un toque extra.
3. **Secundaria en celular.** Las 7 pestañas ocupan dos filas pegadas arriba y no hay barra inferior, a diferencia de
   Inglés.
4. **Secundaria del profe en PC.** Con «📝 Resultados» y «📥 Entregas» son 9 pestañas y a 1100 px se parten en dos filas.
5. **E2E `ingles-diseno-profe` «🌍 Mundos».** Espera los 9 mundos de la ruta, pero el `plan.json` de prueba solo tiene
   clases en 2: falla por datos, no por código.
6. **Prueba inestable del CI** (`server/salas_grandes_test.ts:243`, Dibuja): falla cuando la palabra al azar es «reloj»,
   porque busca `"reloj"` en el JSON y `reloj` también es una llave de la respuesta.

Las recomendaciones grandes (carga perezosa de los 51 archivos de Juegos y juntar las 17–19 peticiones del panel del
profe) **no** entran: quedan como propuesta aparte en `openspec/changes/navegacion-rendimiento/proposal.md`.

## What Changes

- **Misión principal (PR 1).** Regla pura nueva `SecundariaDatos.misionPrincipal(items, hoy)` en
  `comun/secundaria-datos.js` (probada en Deno) con esta prioridad: (1) lo atrasado y abierto, del más viejo al más
  nuevo; (2) lo de hoy; (3) lo próximo ya abierto (se puede adelantar: `dia` futuro y `disponibleDesde` ya pasó);
  (4) solo si no hay nada abierto, la próxima clase bloqueada. `ingles/secundaria-inicio.js` la usa y dice el motivo
  («Atrasada», «Vence hoy», «Puedes adelantarla · Jue 29», «Próxima: Mié 28»). La ruta del profe
  (`ingles/profe-rpg.js`) y el tablero de Inglés no usan esa función (la ruta del profe está toda abierta y no tiene
  «atrasada»; el Inicio de Inglés muestra la misión del mundo, no una clase): no cambian.
- **Entregas en la barra del profe (PR 2).** `📥 Entregas` pasa a la barra inferior del admin de Inglés
  (`barra: true` en `SECCIONES`): 5 secciones + «☰ Más» = 6, las mismas que ya caben en la barra de alumnos y alumnas
  a 360 px. Lleva un contador con las entregas listas para evaluar (`pendientes` de la bandeja que el panel ya pide; sin
  peticiones nuevas). En PC el menú lateral conserva su orden.
- **Barra inferior de Secundaria en celular (PR 3).** Debajo de 720 px, una barra fija con «🏠 Inicio», «⚔️ Misiones»,
  «🗓️ Horario», «📚 Materias» y «☰ Más» (Semana, Mapa y Árbol); en el profe, «🏠 Inicio», «📝 Notas», «📥 Entregas»,
  «⚔️ Misiones» y «☰ Más» (lo demás). La fila de pestañas se oculta en celular; un hueco al final evita que la barra
  tape contenido. En tablet y PC no cambia la fila de pestañas.
- **Pestañas en una fila en tablet y PC (PR 3).** Desde 720 px la fila de pestañas es siempre una sola fila (columnas
  iguales); entre 720 y 1099 px con el emoji sobre el nombre corto, y desde 1100 px en línea (nombre largo con 7
  pestañas; nombre corto con las 9 del profe).
- **E2E «🌍 Mundos» con su propio fixture (PR 4).** `tests/fixtures/profe-plan-9-mundos.json`: un plan de ejemplo con
  clases en los 9 mundos; la prueba lo sirve solo en su navegador (intercepta el GET de `/ingles/profe/actividades`) y,
  con el plan normal, espera los mundos que salen de `Gamificacion.mapaRuta`. No cambia datos reales ni el fixture
  compartido.
- **Dibuja estable (PR 4).** La prueba busca la palabra y su traducción entre los **valores** del JSON (y la llave
  `palabra` entre las llaves), no como texto suelto: verifica lo mismo sin confundir una llave con la palabra.
- Sin cambios de servidor, contrato HTTP, datos ni peticiones.

## Capabilities

### Modified Capabilities
- `examenes-secundaria`: requisitos nuevos «Prioridad de la misión principal de Secundaria», «Barra inferior de
  Secundaria en celular» y «Pestañas de Secundaria en una fila en tablet y PC».
- `ingles`: requisito nuevo «Entregas en la barra inferior del profe».
- `pruebas`: requisitos nuevos «E2E con fixture propio de la ruta del profe» y «Prueba de Dibuja sin falsos positivos».

## Impact

- Superficies: `ingles.html` (Inglés, Secundaria y la ruta del profe) y `secundaria.html` (puente, sin cambios). No
  toca `index.html`, `juegos.html`, el servidor Deno, Postgres, Realtime, Auth, el repo de datos ni Notion.
- Archivos: `comun/secundaria-datos.js`, `ingles/secundaria-inicio.js`, `ingles/secundaria.js`, `ingles/app.js`,
  `ingles/comun.js`, `ingles/secundaria-misiones.js`, `ingles/secundaria.css`, `ingles/ingles.css`, `ingles.html`
  (`?v=`); pruebas `server/secundaria_tablero_test.ts`, `server/salas_grandes_test.ts` y E2E
  (`navegacion-dispositivos`, `secundaria-*`, `misiones`, `ingles-diseno-profe`, `ingles-admin`); docs
  `docs/frontend-standards.md`, `docs/pruebas.md`.
- Peticiones: las mismas (el contador de Entregas usa la bandeja que el panel ya pide).
- Matriz de acceso: sin cambios. La alumna ve solo sus clases; el profe (admin) ve el tablero de la alumna elegida en
  solo lectura y la bandeja de entregas, como hoy. Se verifica con las E2E `secundaria-dashboard` (alumna y admin) e
  `ingles-admin`.
- Acciones externas: ninguna.

## Cómo revertir

Revertir el PR correspondiente (solo estáticos y pruebas).
