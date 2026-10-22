## Context

`ingles.html` como admin (`ingles/app.js`, `loadFor`) hoy hace, tras `/config`:

```
(actividades ‖ data) ──► isAdmin ──► (juegos/admin/resumen ‖ alumnos ‖ grupos) ──► render ──► (resumen ‖ profe/entregas)
```

Cada GET lleva `Authorization`, así que cada URL distinta paga además un `OPTIONS` (CORS, `Max-Age` 1 día por URL).
La oleada 3 depende de saber que es admin (lo dice `/ingles/data`) y la 4 se lanza al final de `render()`
(`cargarResumen`). En celular cada oleada es otra vuelta de red y otro tramo de CPU lento.

## Goals / Non-Goals

**Goals**
- Abrir el panel con `/config` → (`/ingles/actividades` ‖ `/ingles/data?incluir=panel`): 5 peticiones, 2 oleadas
  después de `/config`, sin cascada propia del panel.
- Resiliencia por parte: una falla no tumba el panel; aviso por sección.
- Cero correos en el panel; matriz de acceso igual (solo admin).
- Rutas existentes compatibles; las acciones (ocultar, mover, alta, baja, entregas, nicks) siguen igual.

**Non-Goals**
- No se cambia `/ingles/actividades` (el admin la necesita para «Alumnos», «Semana», «Resultados», «Material»,
  «Presentar» y el cajón; ya va en paralelo con `/ingles/data`).
- Sin caché nueva en el servidor (las lecturas ya pasan por la caché del almacén y de los grupos).
- No se toca la ruta del profe (`?modo=profe`), Secundaria ni Juegos.

## Decisions

### 1. `armarPanel` reutiliza los manejadores existentes
`server/panel.ts` recibe cuatro funciones que devuelven `Response` (las mismas rutas internas de `main.ts`:
`rutaGrupos`, `rutaAlumnos`, `rutaResumen`, `handleProfeEntregas`) y las corre con `Promise.all`, cada una envuelta:
- 200 → su cuerpo, recortado: `alumnos` → `[{ nombre, baja? }]`; `entregas` → `{ pendientes, ingles, secundaria }`;
- otro status → `{ error: body.error ?? "upstream_error" }` (+ `detalle` si lo trae);
- excepción → `{ error: "upstream_error", detalle: mensaje ≤ 200 }` (solo lo ve el admin).

Así el panel sale idéntico a las rutas sueltas (mismos filtros de grupo, ocultos y bajas) y no se duplica lógica.
`fallas` lista las partes con error, salvo `sin_base` (sin Postgres no hay grupos, como hoy con el 503).
Alternativa descartada: reescribir las lecturas en un solo módulo; duplicaba reglas (ocultos, bajas, «primer grupo
activo») y su mantenimiento.

### 2. `incluir=panel` en `/ingles/data` en vez de adivinar si es admin
La página no sabe si la persona es admin hasta `/ingles/data`. Opciones:
- pedir `/ingles/panel` después (sigue la cascada: +1 oleada);
- recordar en `localStorage` que «este correo era admin» (falla la primera vez y si cambia el rol);
- **`/ingles/data?incluir=panel`**: el servidor ya sabe quién es; si es el admin, arma el panel en paralelo con las
  filas y lo agrega como `panel`. Para cualquier otra persona se ignora. Elegida: 0 oleadas extra, sin estado en el
  navegador y aditiva (el contrato de `/ingles/data` solo gana un campo opcional para el admin).
`GET /ingles/panel` queda para refrescar (Reintentar, ocultar/mostrar grupo) con los mismos parámetros.

### 3. Estado en el navegador
- `state.alumnosAdmin` = lista ligera del panel (`nombre`, `baja`): conteos, tarjetas, `ocultoEnPanel`.
- `state.registroAdmin` = lista con correos de `/ingles/alumnos`, solo para «➕ Registro» (se pide al abrirla; se
  repinta solo la lista, no el formulario).
- `state.juegos` = `undefined` hasta abrir «🎮 Juegos», «🧑‍🎓 Alumnos» o el cajón; al llegar se repinta
  `#juegos-admin`, los huecos `[data-juegos-slot]` de cada alumno y el cajón abierto.
- `state.panelEntregas` = `{ pendientes, ingles, secundaria }`. `conteoEntregas()` (`tablero.js`) es la única fuente
  de «📥 Por revisar» y del contador de la barra (`entregasPendientes`, `app.js`): la bandeja si ya se cargó
  (`state.secBandeja`, más fresca tras evaluar) y si no, el panel. Decisión: el total Inglés + Secundaria sin filtro
  de grupo (lo que la bandeja muestra) con desglose en el mosaico, en vez de filtrar el mosaico por grupo y dejar el
  contador distinto; así los dos números siempre coinciden y no hace falta mandar slugs.
- `cargarResumen()` deja de pedir la bandeja.
- `state.panelFallas` = partes que fallaron → aviso `#panel-avisos` con «🔄 Reintentar» (`/ingles/panel`).

### 4. Ocultar/mostrar grupo con una petición
Antes: `POST /ingles/grupos/ocultar` → `GET /ingles/grupos` → `GET /ingles/resumen` (+ bandeja). Ahora:
`POST` → `GET /ingles/panel` con el filtro vigente. Cambiar el filtro o el interruptor sigue con `/ingles/resumen`
(solo cambia el resumen).

## Risks / Trade-offs

- **Respuesta más grande de `/ingles/data` para el admin** → el resumen ya se pedía; se ahorran 6–8 cabeceras,
  verificaciones previas y vueltas de red. Los alumnos y alumnas no cambian.
- **Pruebas que leían pestañas ocultas sin abrirlas** (`#juegos-admin`, `#alumnos-admin` con correos) → se
  actualizan para abrir la pestaña, como haría el profe.
- **`ingles-diseno-profe` intercepta `GET /ingles/grupos`** para simular dos grupos → ahora intercepta la respuesta
  del panel (`/ingles/data?incluir=panel` y `/ingles/panel`) y cambia su parte `grupos`.
- **Choque con `navegacion-mejoras` (PR 2)** en `ingles/app.js` y `ingles/secundaria-misiones.js` → cambios aditivos,
  merge de `main` frecuente; si chocan, este PR se fusiona después.

## Migration Plan

Despliegue normal (Deno Deploy y Pages desde `main`). Servidor y página son compatibles en ambos órdenes: una página
vieja ignora `panel`; una página nueva con un servidor viejo no recibe `panel` y cae al camino de antes (pide grupos,
alumnos y resumen sueltos). Reversión: revertir el PR.
