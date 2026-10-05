## Decisiones
1. **Misma cuenta, otro nombre.** La «cuenta de Juegos» es el invitado de siempre: correo + enlace mágico +
   apodo + aceptación. Así no hay datos nuevos ni migración, y el admin la sigue viendo en 📋 Invitados.
2. **Portal:**
   - debajo del formulario, un bloque «🎮 ¿Solo vienes a jugar?» con un botón a `juegos.html`, que pide el correo y
     manda el enlace;
   - correo sin clases: el mensaje cambia de error a invitación («Ese correo no tiene clases registradas. Si
     vienes a jugar, crea tu cuenta de Juegos 👇») y el botón dice «🎮 Crear mi cuenta de Juegos →»;
   - `?juegos=1` redirige a `juegos.html` y conserva `?api=`.
3. **Juegos:**
   - la entrada dice «¿Primera vez? Escribe tu correo y crea tu cuenta de Juegos en un minuto, sin contraseña»;
   - la pantalla del apodo se titula «🎮 Crea tu cuenta de Juegos» y su botón dice «Crear mi cuenta y jugar».

## Pruebas
- E2E de login:
  - el botón visible del portal lleva a la entrada de Juegos;
  - un correo desconocido ve la invitación y la cuenta se crea con apodo;
  - `?juegos=1` lleva a Juegos.
- Las pruebas del servidor no cambian.
