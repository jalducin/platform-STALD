# Diseño — fix-ingles-admin

## 1. Por qué `upstream_error` y no otra cosa

- `/ingles/resumen` no toca Notion: `rutaResumen` (`server/main.ts`) usa `filasInglesActivas()` (registro
  `alumnos.json`), los grupos de Postgres y `handleResumen`. La prueba `resumen_resiliente_main_test` lo fija con
  `NOTION_TOKEN` puesto, sin `ROWS_FIXTURE` y con `api.notion.com` respondiendo 404: 0 llamadas a Notion.
- No se pudo reproducir el 500 en local con la copia real de datos (con y sin PostgREST falso): con lecturas sanas el
  resumen responde 200. Los datos de producción en `stald_*` no se consultaron (regla del proyecto).
- El 500 genérico solo sale si algo lanza. Dentro del resumen, lo único externo que puede lanzar es PostgREST (timeout
  de 5 s, 5xx) y GitHub (contenido). Al inyectar un timeout en **una** lectura de resultados, el resumen
  respondía exactamente `{"error":"upstream_error"}` (prueba en rojo antes del cambio).
- Por eso el arreglo es doble: que una lectura fallida degrade en lugar de tumbar el resumen y que el admin vea el
  motivo (`detalle`) si vuelve a pasar algo no cubierto.

## 2. Degradar sin mentir

- **Columna sin resultados legibles → fuera.** Si se dejara con celdas vacías, saldría como «atrasada» o
  «sin entregas» para todos (falso). Fuera de `columnas` no cuenta en «A tiempo», «Promedio», «Atrasos» ni
  «Sin entregas». El aviso lo dice.
- **Reintento único** por columna: un timeout aislado se recupera sin aviso; no se reintenta en bucle.
- **Grupos caídos → sin filtro por grupo.** Mejor ver a todos con aviso que un 500. `?grupo=` no filtra en ese caso
  (igual que sin base de datos).
- `alumnos()` (registro) y el contenido siguen pudiendo lanzar: sin ellos no hay resumen que mostrar. Esos casos
  llevan `detalle` para el admin.

## 3. `detalle` solo para el admin

El mensaje de la excepción puede traer rutas o nombres de tabla. Solo lo ve el admin (correo verificado igual a
`SUPER_ADMIN_EMAIL`); alumnos y alumnas siguen viendo solo `upstream_error`.

## 4. Botón en la tarjeta

- Se reutiliza `data-action="ocultar-grupo"` (manejador `onClick` de `ingles/app.js` → `ocultarGrupo` de
  `ingles/admin.js`): no se duplica lógica.
- `gruposDelPanel()` ya filtra los ocultos salvo con el interruptor; al ocultar, la tarjeta desaparece sola; con el
  interruptor reaparece marcada.
- `renderTarjetasGrupo(null)` pinta las tarjetas sin resumen (avance «—»), para que el botón no dependa de que el
  resumen cargue.
- Como el botón ahora existe dos veces en el DOM (Resumen y «👥 Grupos», en secciones ocultas por pestaña), las
  pruebas acotan el selector a su sección.
