## Context

La ruta propia del profe (`contenido/profe/`) reutiliza el motor del grupo: semanas, `disponibleDesde`,
`fechaLimite`, `estadoItem` y `abreYa`. El servidor ya resolvía por id cualquier elemento cuyo `disponibleDesde` ≤ hoy
(`bloqueoDeAlumno` usa `estadoItem`), así que el bloqueo real estaba en la **lista** (`visibleItems` filtra semanas
por su lunes) y en el **validador** (reglas del grupo).

## Goals / Non-Goals

**Goals:** que el profe vea y resuelva toda su ruta en cuanto `disponibleDesde` lo permita; validador sin errores
con esos datos; alumnos y alumnas sin cambios.

**Non-Goals:** cambiar el modelo de datos, las semanas del grupo dentro de la ruta del profe (`paraProfe` ya las abre)
ni el cálculo de «fuera de tiempo» (sigue contra `fechaLimite`).

## Decisions

1. **La apertura la decide `disponibleDesde`, no el lunes de la semana (solo ámbito profe).** En `visibleItems`, con
   `ambito.clave === "profe"`, se agregan los elementos de semanas futuras con `abreYa(disponibleDesde, hoy)`.
   Alternativa descartada: listar todas las semanas siempre (mostraría como «próximamente» lo que el profe aún no
   abre, y cambiaría el contrato para rutas que sí quieren abrir por semana).
2. **«Esta semana» no cambia.** `semanaPropia` sigue siendo la que contiene hoy; el acceso a lo demás es la pestaña
   «Plan del mes», que ya lista las 8 semanas: se le agrega el botón de cada elemento (`accionItem`) y un aviso.
3. **Validador por ámbito.** `erroresApertura(it, id, lunes, esProfe)`: grupo = reglas de siempre; profe = solo
   `disponibleDesde ≤ fechaLimite`. Se mantiene el aviso de patrón de días y el resto de validaciones.

## Risks / Trade-offs

- Un elemento del profe con `disponibleDesde` futuro y semana futura sigue sin listarse hasta abrir (igual que antes).
- La lista del profe crece (24 propios + los del grupo); la carga sigue en caché 60 s por `hoy`.
