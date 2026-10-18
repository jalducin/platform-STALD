## Contexto

`listarActividades` toma `semanaActual`/`semanaSiguiente` de `visibleItems(store, hoy, ámbito)`. Para el profe,
el ámbito es `contenido/profe/`; lo del grupo ya se agrega aparte (`itemsDelGrupo` + `paraProfe`, cambio
`profe-actividades-grupo`).

## Decisiones

1. **Respaldo, no reemplazo.** Si el ámbito del profe no da semana actual ni siguiente, se usan las del grupo
   (`visibleItems(store, hoy, AMBITO_CLASE)`, en caché). Mantiene intacto el soporte de ruta propia (por si se
   retoma) y no cambia la forma del JSON.
2. **Sin migración de datos ni banderas.** Borrar `contenido/profe/` basta; `store.list` de una carpeta inexistente
   devuelve `[]` (GitHub y memoria) y `plan.json` ausente da `plan: null`.
3. **UI condicionada a `plan`.** Las piezas del plan (pestaña, barra «Ruta del mes») dependen de que exista; los
   títulos dejan de nombrar C1. La pestaña guardada `plan` cae a «Esta semana».
4. **Meet fuera.** Sigue sin incluirse en la lista del profe (la clase la da él); por eso la tarjeta de la semana
   muestra actividades, examen, refuerzo y Tecnología e IA.

## Riesgos

- E2E que dependían del contenido C1 (`ruta-profe`, `profe-diseno`, `pronunciacion`): se actualizan o se omiten con
  aviso; el motor de pronunciación conserva sus pruebas unitarias.
