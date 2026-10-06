## Por qué
- **Exámenes que se pierden.** Comentario real: «El examen de Secundaria, con el mínimo movimiento se pierde. Si Sofy
  pausa, debe guardar el avance». El reproductor (`ingles/reproductor.js`) guarda las respuestas solo en el DOM de
  `#exam-form`. Si la página se recarga (en celular basta jalar la pantalla hacia abajo), el navegador la descarta
  al cambiar de app o se toca «← Volver», se pierde todo. El examen de Secundaria tiene 100 preguntas.
- **«Revisa tu correo» sin salida.** Personas reales se registran y el servidor de correo de prueba de Supabase no
  les entrega el enlace (2 cuentas sin confirmar el 2026-10-05). Se quedan en «Revisa tu correo ✉️» sin saber qué
  hacer. El arreglo de fondo (SMTP propio) es del usuario; aquí se mejora la pantalla.

## Qué cambia
1. **Autoguardado del avance** en el navegador (`localStorage`), por persona + ámbito + elemento + intento:
   - se guarda en cada respuesta (opción múltiple, respuesta escrita y pronunciación);
   - se restaura solo al volver a abrir el mismo intento y avisa «Recuperamos tus N respuestas»; en modo paso
     (celular) salta a la primera pregunta sin contestar;
   - se borra al enviar con éxito, al abrir un intento posterior y al cerrar sesión; caduca a los 14 días;
   - aviso discreto «Tu avance se guarda solo en este aparato ✔» e indicador «Guardado hace un momento»;
   - mientras el examen está abierto: sin «jalar para recargar» (`overscroll-behavior-y: contain`) y confirmación
     del navegador al salir si hay respuestas sin enviar.
   - Nunca se manda el borrador al servidor: no hay endpoint nuevo.
2. **«¿No te llegó?»** en el paso del código (`comun/auth.js` → `pintarEntrada` y el paso propio de `index.html`):
   ayuda (spam o promociones, pedir uno nuevo, pedir el enlace al profe por WhatsApp) y botón «📧 Reenviarme el
   enlace» con espera de 60 s entre envíos y el resultado del envío.

## Superficies
- `ingles.html` (Inglés, `?modo=profe`, `?modo=secundaria`): `ingles/reproductor.js`, `ingles/app.js`,
  `ingles/ingles.css`.
- `comun/auth.js` (Juegos, Inglés, Secundaria) e `index.html` (portal).
- Pruebas: `tests/e2e/e2e-autoguardado.js` (nueva), `tests/e2e/e2e-login.js`, `tests/e2e/correr.sh` y un examen de
  prueba en `tests/fixtures/datos/`.
- Sin cambios en el servidor Deno, Postgres, Realtime, Auth, repo de datos ni Notion.

## Matriz de acceso
- El borrador vive solo en el `localStorage` del aparato de quien contesta. La clave usa un hash corto del correo
  (no el correo en claro). Nadie más lo ve: no viaja al servidor. «Cerrar sesión» en Inglés borra los borradores.
- El reenvío del enlace usa la misma llamada que el primer envío (`enviarEnlace`): sin permisos nuevos.

## Acciones externas
- SMTP propio en Supabase Auth para que el correo llegue (usuario). Fuera de este cambio.
