## Decisiones
- `data-a="registrar"` → `confirm('¿Cerrar tu sesión en este aparato para que otra persona cree su cuenta de
  Juegos?')`. Si acepta: `StaldAuth.salir()`, se limpia `state.email` y se abre `pantallaRegistro()`, el mismo
  registro de 2 pasos.
- Se quita el botón de compartir del hub (`compartirRegistro` y `enlaceRegistro`). El enlace `?registro=1` sigue
  sirviendo para mandarlo por WhatsApp.

## Pruebas
- E2E de login: con sesión, «🆕 Registrar» cierra la sesión, muestra el registro, y una segunda persona se registra y
  entra con su apodo.
