## Por qué
El profe ve a los invitados de Juegos, pero no tiene una vista de **todos** los jugadores registrados ni de quién
se quedó a medio registro. Por ejemplo, alguien que creó su cuenta y no confirmó el correo porque no le llegó; hoy
eso solo se descubre revisando Supabase a mano.

## Qué cambia
- `GET /juegos/jugadores` (solo admin):
  - **jugadores**: alumnos y alumnas de Inglés y Secundaria e invitados, con tipo, espacio, puntos y partidas de la
    semana, y última visita;
  - **pendientes**: cuentas de acceso sin terminar, con estado «sin confirmar» (nunca abrió el enlace) o
    «sin apodo» (entró, pero no creó su cuenta de Juegos).
- `POST /auth/enlace` acepta `destino: "juegos"` para que el enlace lleve directo a Juegos.
- Juegos (admin): pestaña «👥 Jugadores» con buscador, las dos listas, botón «🔗 Enlace de acceso» por pendiente
  (con copiar y compartir) y descarga CSV.
- Los correos solo los ve el admin, igual que en «📋 Invitados».
