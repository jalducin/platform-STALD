// Misma E2E de login con el servidor en la fase posterior a la transición (LOGIN_TRANSICION_HASTA en el pasado).
process.env.FASE = 'despues';
require('./e2e-login.js');
