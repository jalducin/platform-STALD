## ADDED Requirements

### Requirement: Interruptores públicos sin deploy
El servidor SHALL exponer `GET /interruptores` sin sesión, con `{ privacidad: boolean }`, leído del documento
`config/interruptores.json` de `stald_docs` (o del almacén de datos cuando no hay Postgres). La respuesta SHALL
contener solo las llaves conocidas, y una llave SHALL estar encendida solo si su valor es `true` estricto. Si el
documento no existe o no se puede leer, todas las llaves SHALL estar apagadas. La lectura SHALL guardarse en memoria
60 s y la respuesta SHALL poder guardarse en el navegador 60 s. Cualquier método distinto de `GET` SHALL responder 405.
Cambiar el documento SHALL bastar para encender o apagar, sin redeploy.

#### Scenario: Sin documento
- **WHEN** alguien sin sesión pide `GET /interruptores` y no existe `config/interruptores.json`
- **THEN** recibe 200 `{ "privacidad": false }`

#### Scenario: Encendido con llaves de más
- **WHEN** el documento es `{ "privacidad": true, "otra": "x" }`
- **THEN** la respuesta es `{ "privacidad": true }` con `Cache-Control: public, max-age=60`

#### Scenario: Valor que no es booleano
- **WHEN** el documento es `{ "privacidad": "true" }`
- **THEN** la respuesta es `{ "privacidad": false }`

#### Scenario: Postgres caído
- **WHEN** la lectura de `stald_docs` falla
- **THEN** la respuesta es `{ "privacidad": false }` y no se muestra ningún borrador

#### Scenario: Cambio de dato
- **WHEN** el profe cambia el documento a `{ "privacidad": true }`
- **THEN** a más tardar 60 s después el servidor responde encendido, sin redeploy

#### Scenario: Escritura
- **WHEN** alguien hace `POST /interruptores`
- **THEN** recibe 405

### Requirement: Aviso de privacidad y formato de consentimiento detrás de su interruptor
La plataforma SHALL publicar `privacidad.html` (aviso de privacidad integral en lenguaje claro) y
`consentimiento.html` (formato imprimible en tamaño carta para madre, padre o tutor). Con el interruptor
`privacidad` apagado (o sin poder leerlo), ambas páginas SHALL mostrar «Próximamente» sin el texto, y los pies de
`index.html`, `ingles.html` y `juegos.html` SHALL NOT mostrar enlaces a ellas. Con el interruptor encendido, esos pies
SHALL mostrar «🔒 Aviso de privacidad» y las páginas SHALL mostrar su texto.

El aviso SHALL decir qué datos se guardan (nombre de pila, correo de acceso, resultados, avance y los datos de Juegos:
apodo, avatar o foto, partidas, avance e invitados), para qué (finalidades necesarias y secundarias por separado),
dónde (Supabase/Postgres y repo privado), quién los ve tal como funciona hoy (en Juegos, quienes juegan ven apodo y
avatar; si no hay apodo, el nombre de pila), que no se venden ni se comparten, cómo será el
tutor IA (fase futura, sin datos personales hacia el proveedor y con bitácora), los plazos de conservación, los
derechos ARCO y cómo ejercerlos (escribirle al profe por el canal de la escuela) y cómo se avisan los cambios.
Mientras el profe no apruebe el texto, ambas páginas SHALL llevar una nota visible de borrador. Ninguna SHALL
contener correos ni nombres reales.

El formato SHALL tener autorizaciones separadas para el uso de la plataforma, la foto en el avatar de Juegos, el
ranking de Inglés por apodo (oculto por defecto) y, como opcionales de fases futuras, el tutor IA y las entregas con imagen o audio; campos en blanco para el
nombre del alumno o alumna, de quien firma, fecha y firma; y SHALL decir que la plataforma no guarda el documento
firmado.

Ambas páginas SHALL verse en claro y oscuro y a 360 px sin scroll horizontal; el formato SHALL imprimirse en una
hoja carta sin navegación ni botones.

#### Scenario: Apagado
- **WHEN** una alumna abre el portal, Inglés o Juegos con el interruptor apagado
- **THEN** no ve ningún enlace al aviso
- **AND** si abre `privacidad.html` o `consentimiento.html` directamente ve «Próximamente» y no el texto

#### Scenario: Servidor sin responder
- **WHEN** `GET /interruptores` falla por red
- **THEN** las páginas muestran «Próximamente»

#### Scenario: Encendido
- **WHEN** el interruptor está encendido y un alumno abre el portal a 360 px
- **THEN** ve «🔒 Aviso de privacidad» en el pie, sin scroll horizontal
- **AND** el aviso muestra sus secciones (responsable, datos, finalidades, dónde, quién los ve, no compartimos, tutor
  IA, conservación, menores, ARCO, aparato y cambios) y enlaza al formato
- **AND** no promete lo que hoy no ocurre: dice que en Juegos se ven apodo y avatar, y que el borrado es a mano

#### Scenario: Imprimir el formato
- **WHEN** el profe imprime `consentimiento.html`
- **THEN** sale una hoja carta con las 5 autorizaciones y los campos en blanco, sin botones ni navegación
