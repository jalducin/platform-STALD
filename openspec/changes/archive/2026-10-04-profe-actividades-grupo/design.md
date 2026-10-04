## Decisiones

### 1. Elementos del grupo para el profe
- `itemsDelGrupo(store)` reúne:
  - de todas las semanas de `contenido/semanas/`, los elementos `actividad`, `examen` y `refuerzo`;
  - los exámenes sueltos.
  - Se carga con `AMBITO_CLASE` y tiene caché de 60 s.
- `paraProfe(it)` = `{ ...it, disponibleDesde: "2000-01-01", fechaLimite: díaAnterior(it.disponibleDesde) }`.
- Lo ya publicado al 1 de octubre queda así:

| Elemento | Abre para el grupo | Fecha del profe | Estado hoy |
|---|---|---|---|
| act-2026-09-29 | 28 sep | 27 sep | atrasada |
| act-2026-10-01 | 28 sep | 27 sep | atrasada |
| diagnostico-a1 | 26 sep | 25 sep | atrasada |
| examen-2026-10-02 | 2 oct | 1 oct | hoy |
| refuerzo-2026-10-03 | 3 oct | 2 oct | mañana |

- Los ids del grupo no chocan con los de la ruta del profe, porque esos llevan el prefijo `profe-`.

### 2. Rutas
- **Listado** (ámbito profe, identidad "Profe"): los elementos del profe más los del grupo, ya pasados por
  `paraProfe`, con estado calculado con sus resultados y `grupo: true`.
- **Elemento**: si el id no existe en el ámbito profe, se busca en el del grupo (solo los tipos permitidos)
  y se aplica `paraProfe`. Los intentos se guardan en `resultados/<id>/profe.json`.

### 3. Exclusión en las vistas del grupo
`resultadosDe` ignora `profe.json`. De ahí salen el listado del admin, el resumen de temas a reforzar y la
tarjeta de últimas calificaciones, así que el profe nunca aparece como alumno.

### 4. Página
En el modo profe, la tarjeta "📚 Lo de tu grupo (resuélvelo antes que ellos)" va **antes** del plan, porque es lo más urgente. Lista los
elementos `grupo` pendientes primero, cada uno con su botón (`accionItem`). El tablero los incluye con sus fechas
del profe.
