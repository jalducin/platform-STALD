## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-diseno-profe` desde `origin/main` (add2a99); merge de `main` con
  `estilos/ui.css`, ocultar grupos, nicks, entregas y la vista RPG de alumnos y alumnas

## 1. Panel del admin

- [x] 1.1 `ingles/panel-profe.css` (nuevo): botones, campos y encabezado de 44 px, superficies RPG, encabezado del
  panel, tarjetas por grupo, mapa de calor y tablas como tarjetas abajo de 640 px, Registro, Grupos y casillas
- [x] 1.2 `ingles/tablero.js`: `#panel-profe` (grupos activos, alumnos y alumnas, «En riesgo», «📥 Por revisar» y
  accesos; alcance del grupo elegido y de los ocultos), tarjetas por grupo con avance y «🔍 Ver grupo», `data-label`
  en el mapa de calor, repintado al llegar el resumen y la bandeja
- [x] 1.3 `ingles/admin.js`: Registro como tarjetas (grupo, «🚪 Baja de Inglés», Quitar, Reactivar), etiquetas
  visibles en el alta y en grupos, «🎥 Meet», «👁️ Ocultar del panel» y «✏️ Editar» como botones de 44 px
- [x] 1.4 `ingles.html` e `index.html`: `panel-profe.css`, `profe-rpg.js` y `?v=` de lo tocado

## 2. Ruta del profe con la experiencia RPG

- [x] 2.1 Pruebas que fallan primero (`server/gamificacion_profe_test.ts`): catálogo de mundos, mundo por patrón y por
  semana, mapa sin «bloqueado», XP «a su ritmo», insignias con `mapa`
- [x] 2.2 `comun/gamificacion.js` (aditivo): `MUNDOS_RUTA_PROFE`, `mundoDeClaseRuta`, `mapaRuta`, `mundoActualRuta`,
  `xpRuta` e `insigniasDe({ mapa })`
- [x] 2.3 `ingles/profe-rpg.js` (nuevo): barra RPG, misión principal, retos de hoy, «🌍 Mundos», mundo de la clase y
  recompensa al enviar
- [x] 2.4 `ingles/profe.js`: tablero RPG, pestaña «🌍 Mundos», «Para hoy» y «Mundos» en lugar de «Atrasadas»,
  «Pendiente ahora» con 5 a la vista
- [x] 2.5 `ingles/reproductor.js` y `ingles/secundaria-clase.js`: clase por pasos como «⚔️ Misión» con su mundo y
  «+XP» también en `?modo=profe`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar los selectores de las E2E de admin/profe (`alta-alumnos`, `baja-ingles`, `material`, `profe-grupo`,
  `ruta-profe`, `profe-diseno`, `presentar`, `grupos`, `ocultar-grupos`, `ingles-pro`): se conservan ids,
  `data-action`, `data-baja`, `.ultimas-lista`, `#bajas-ingles`, `select.mover-grupo`, `#mapa-calor tr[data-alumno]`
  y `#pf-urgente`; ajustar `profe-diseno` si cuenta las pestañas
- [x] 3.2 E2E nueva `ingles-diseno-profe` (fase `ingles`): encabezado (con «Por revisar», grupo elegido y sin grupos),
  tarjetas por grupo, mapa de calor como tarjetas, Registro, cajón, 44 px y sin scroll a 360 px en las 11 secciones,
  claro y oscuro; ruta RPG (barra, misión, retos, sin «atrasada»), «🌍 Mundos», clase por pasos, envío con «+XP»,
  Plan del mes (27 abiertas) y capturas de escritorio

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/` y la suite E2E completa con una copia
  temporal del repo de datos (puertos 8951/8952; subagente `verificador-pruebas`), más las de Inglés con
  `--hoy 2026-10-22`. Sin tablas `stald_` y sin push de datos. Comparar con la línea base de `main`
- [x] 4.2 Reporte `openspec/changes/ingles-diseno-profe/reports/2026-10-22-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas a 360 px en claro y oscuro (Resumen, Registro, cajón, ruta RPG, Mundos, clase, recompensa
  y Plan del mes) y en escritorio
- [ ] 5.2 Producción tras el merge, solo lectura: `/salud`; `ingles.html` publica `panel-profe.css`, `profe-rpg.js` y
  los `?v=` nuevos

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (panel del profe, ruta RPG y catálogo de mundos) y `docs/pruebas.md` (E2E
  nueva). `docs/backend-standards.md` no cambia (no cambia el contrato)

## 7. Cierre

- [ ] 7.1 `openspec archive ingles-diseno-profe` después de la verificación en producción
