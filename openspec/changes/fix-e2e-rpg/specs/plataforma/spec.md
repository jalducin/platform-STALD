## ADDED Requirements

### Requirement: Interruptores públicos en /config
`GET /config` SHALL incluir, cuando responde 200, el campo `interruptores` con solo las llaves conocidas y valores
booleanos, los mismos que `GET /interruptores`, para que las páginas con sesión no pidan `/interruptores` aparte.
`/config` SHALL NOT esperar la lectura de los interruptores:
- SHALL usar el último valor leído y refrescarlo en segundo plano;
- si el servidor aún no los lee, SHALL responder sin el campo;
- el servidor SHALL leerlos al arrancar.

`comun/interruptores.js` SHALL tomar los interruptores del `/config` que leyó `comun/auth.js`
(`StaldAuth.configLeida()`). SHALL pedir `GET /interruptores` solo si:
- la página no carga `auth.js`;
- `/config` falló;
- `/config` no trae el campo;
- no llegó en 15 s.

En todos los caminos SHALL fallar cerrado (todo apagado).

#### Scenario: Página con sesión
- **WHEN** una alumna abre el portal, Inglés o Juegos
- **THEN** el interruptor `privacidad` sale del `/config` de la página y no hay `GET /interruptores`

#### Scenario: Página sin auth.js
- **WHEN** alguien abre `privacidad.html` o `consentimiento.html`
- **THEN** la página pide `GET /interruptores`, como antes

#### Scenario: Servidor recién arrancado o anterior
- **WHEN** `/config` responde sin `interruptores`
- **THEN** la página pide `GET /interruptores`; si esa petición también falla, todo queda apagado

#### Scenario: Error de configuración
- **WHEN** `/config` responde 503 `sin_config`
- **THEN** la respuesta no trae `interruptores` y lleva `no-store`

## MODIFIED Requirements

### Requirement: Verificación previa reutilizada
Las páginas SHALL pedir al API sin saltarse la caché del navegador, para que la verificación previa de CORS
(`OPTIONS`) de cada URL se haga una sola vez y se reutilice según `Access-Control-Max-Age`. Las respuestas con datos
personales SHALL seguir con `Cache-Control: no-store`, de modo que el navegador no las guarde.

#### Scenario: Sondeo de una sala
- **WHEN** dos personas juegan una partida de ¡Una! durante 30 s sin Realtime
- **THEN** cada página hace como máximo un `OPTIONS` por URL de la sala y el total de peticiones al API del flujo
  baja de 64 a 42 o menos (14 fijas más el sondeo de 2.5 s de cada página; ver el spec `pruebas`)

#### Scenario: Datos personales no se guardan
- **WHEN** el API responde `/perfil`, `/ingles/data`, `/ingles/actividades` o `/juegos/yo`
- **THEN** la respuesta lleva `Cache-Control: no-store` y no trae `ETag`
