## Por qué
Los jugadores nuevos se quedan atorados: el correo con el enlace no les llega (el servidor de correo de prueba de
Supabase no entrega a todos), y cuando llega, lo abren dentro de WhatsApp y la sesión se queda en ese navegador.
El profe pide que queden registrados **sin validar el enlace**: correo + apodo, y a jugar.

Además hay un bug: el código que llega por correo tiene 8 dígitos, pero la pantalla solo deja escribir 6.

## Qué cambia
- `POST /juegos/registro { email, nombre, acepto }`, sin sesión previa:
  - si el correo es de un alumno, una alumna o del profe → 409 `correo_de_clase`: esas cuentas ven calificaciones,
    así que siguen entrando con su enlace;
  - si no, da de alta (o actualiza) al invitado y devuelve `token_hash`: una llave de un solo uso que el servidor
    genera con la Admin API (`generate_link`) sin mandar correo;
  - la página la canjea (`verifyOtp`) y entra a jugar al instante.
- Juegos, registro paso 2: correo + «🎮 Entrar a jugar», sin enlace ni código. Si el correo es de una clase, pasa a
  la entrada con enlace.
- Riesgo aceptado por el profe: quien sepa el correo de otro **invitado** puede entrar a su cuenta de Juegos. Solo
  expone el apodo y los puntos de Juegos, nada de clases.
- El código de acceso acepta de 6 a 8 dígitos, en el portal y en la entrada común.
