## Why

Regla del profe (2026-10-24): «Las actividades deben guardar el avance: si no lo envió pero avanzó una parte, que se
guarde, y se revisa hasta que se envía».

El autoguardado en el servidor (`borrador-en-servidor`) se hizo para el examen en lista. Desde entonces cambió la forma
de responder: clase por pasos de Secundaria (#225), actividades y exámenes de Inglés por pasos (#237), misiones con
entrega de texto por pasos (#233), ruta del profe con clases como misión (#239) y la casilla «✅ Ya la hice». La
auditoría (lectura del código de cada flujo; el «después» se comprueba con la E2E nueva `autoguardado-todo`) encontró:

| Flujo | Guarda en servidor | Recupera (recargar / otro navegador) | No califica | Limpia al enviar |
|---|---|---|---|---|
| Clase/actividad/examen/refuerzo/reto del Meet (Secundaria, Inglés, profe) | Sí, con 2.5 s de espera; **no** al cambiar de paso | Respuestas sí; **no el paso** (iba a la primera sin contestar) y **al recargar volvía a la lista** | Sí | Sí |
| Misiones de texto (Secundaria y My Hero Card) | **No: solo en el aparato** | **No en otro navegador** | Sí | Solo el local |
| Indicador | «Tu avance se guarda en tu cuenta ✔ · Guardado hace un momento», sin reintento | — | — | — |
| Cerrar sesión | Borraba los borradores del examen, **no los de misiones** (texto libre en un aparato compartido) | — | — | — |

## What Changes

- **Misiones de texto:** `PUT /misiones/<id>/borrador { paso, texto }` guarda el avance por persona, misión y paso en
  `borradores/misiones/<id>/<slug>.json` (Postgres). `GET /misiones` lo devuelve a su dueña o dueño (`borrador`). No es
  entrega: el admin no lo ve (bandeja ni vista de la alumna) y no da XP. Hasta 4 000 caracteres; texto vacío lo quita;
  misión evaluada → 409. Entregar el paso borra su borrador; «Borrar todas sus entregas» y la retención del 31 de agosto
  también borran los borradores. En la página: copia inmediata en el aparato, subida 2.5 s después del último cambio,
  al salir del cuadro, al ocultar la pestaña y al volver la red; gana la copia más reciente.
- **Actividades y exámenes:** el borrador guarda también el `paso` (pregunta visible) y se sube **ya** al cambiar de
  paso. Al recargar dentro de una actividad (`#ver/<id>`) se reabre sola en el mismo paso. Si el intento ya se envió
  desde otro navegador, el guardado responde 409 y la página lo avisa.
- **Indicador común:** «Guardando…», «💾 Guardado hace 5 s» y, sin red o con error, «📴 No se pudo guardar… 🔄 Reintentar».
- **Cerrar sesión** borra también los borradores de misiones del aparato (la copia sigue en la cuenta).
- **E2E nueva `autoguardado-todo`** (dos navegadores incluidos) y ajustes a `autoguardado` y `ordenar-emparejar`.
- Fuera de alcance: «✅ Ya la hice» de la libreta sigue solo en el aparato (es una marca personal, no avance que se
  califique ni entrega); queda anotado para un cambio aparte.

## Capabilities

- `actividades-online` (MODIFIED «Avance del examen guardado en la cuenta», «Avisos de guardado y protección al salir»
  y «Autoguardado del avance en el aparato»).
- `examenes-secundaria` (ADDED «Avance de la clase de Secundaria guardado en la cuenta»).
- `misiones` (ADDED «Borrador de la entrega de texto en la cuenta»).

## Impact

- Superficies: `ingles.html` (y `secundaria.html`, que la usa), servidor Deno (`server/misiones.ts`,
  `server/actividades.ts`, `server/retencion_entregas.ts`, `server/main.ts`), Postgres (`stald_docs`, ruta nueva
  `borradores/misiones/`, sin migración).
- Contrato HTTP: ruta nueva `PUT /misiones/<id>/borrador`; campo nuevo `borrador` en `GET /misiones`; campo opcional
  `paso` en `PUT …/borrador` y en el `borrador` del GET del intento. Documentado en `docs/backend-standards.md` y
  `docs/data-model.md`.
- Matriz de acceso: el borrador solo lo leen y escriben su dueña o su dueño y el servidor. Admin → 403 al escribir; no
  lo ve en «📥 Entregas» ni en la vista de la alumna. Otra persona → 404. Baja o invitado → 403.
- Acciones externas: ninguna (Deno Deploy publica con el merge).
