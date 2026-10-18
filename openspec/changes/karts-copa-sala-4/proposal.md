## Why

El profe jugó una copa en sala de Karts y reportó dos cosas (sprint 43a):

1. «Solo hubo 2 premios, ya no se llevaron las 4 carreras, solo 2»: la copa no se corrió completa para todos.
2. «Espera entre carreras solo 30 segundos»: hoy una carrera cierra cuando reportan todas las personas «esperadas» o
   al vencer el límite de la pista (≈ 300–340 s), así que quien llega primero puede esperar más de 5 minutos.

La causa confirmada del punto 1 (ver design.md §1) es la regla de «personas esperadas»: desde la carrera 2 solo se
espera a quien reportó la anterior sin abandonarla. Basta que alguien pierda **un** reporte (su página se enteró
tarde de la salida y abandonó sola la carrera, bloqueó el celular entre carreras, cerró la pestaña, o el servidor
rechazó su tiempo) para que en la siguiente carrera ya no se le espere: la carrera cierra en cuanto llega quien sí
estaba esperado, a esa persona se le corta la carrera a media pista y su tiempo se rechaza (`carrera_cerrada`). Como
tampoco reportó esa, tampoco se le espera en la que sigue: queda fuera **del resto de la copa**, sin premio en
ninguna carrera más.

## What Changes

- **Todas las personas de la sala cuentan en todas las carreras** de la copa (ya no se arrastra el «esperado»):
  perder una carrera ya no te saca de las siguientes.
- **Plazo de 30 s tras la primera llegada** (`KartsCopa.PLAZO_MS`): cuando la primera persona cruza la meta, las
  demás tienen 30 s para terminar. La carrera cierra cuando todas reportan, al vencer esos 30 s o, si nadie llega, al
  límite de la pista. Lo decide el reloj del servidor; ningún aparato la puede alargar (`carrera_cerrada`).
- **Quien no termina**: NT con 0 puntos; entre quienes no terminaron, el orden es por su avance (‰) si el juego lo
  mandó. Los tiempos imposibles se siguen rechazando.
- **Tabla entre carreras ≤ 10 s** (sin cambio: `INTERPODIO_MS` = 10 s, incluye la cuenta de 3 s) y la siguiente
  arranca sola. Espera máxima de quien llega primero: 30 s + la tabla.
- **Cuenta visible «⏱️ N s para terminar»** en el juego (a quien sigue corriendo) y en la tabla de espera.
- **La página ya no abandona sola una carrera** por enterarse tarde de su salida: entra tarde y corre.
- **Carrera suelta en sala** (Karts sin copa): mismo plazo de 30 s tras la primera llegada para cerrar el podio.
- **Podio final solo al terminar la última carrera**, igual para todas las personas.

Fuera de alcance (otros agentes en paralelo): 3 vueltas (43b) y cambiar el tipo de control y la ceremonia de premios
(43c). La regla no depende del número de vueltas.

Superficies: `juegos.html` (`juegos/app/arcade.js`, `juegos/karts-copa.js`), `juegos/karts.html`, servidor Deno
(`server/karts_copa.ts`, `server/salas.ts`, `server/carreras.ts`). Sin cambios en Postgres (no se escribe en tablas
`stald_*` desde este cambio), Realtime, Auth, repo de datos ni Notion. Sin acciones externas.

Matriz de acceso: sin cambios. Los reportes de cada carrera siguen siendo de cada persona de la sala (403 a quien no
está dentro) y la vista de la copa es la misma pública de antes (sin correos ni datos nuevos).
