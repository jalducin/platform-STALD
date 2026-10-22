## ADDED Requirements

### Requirement: Portal con diseño RPG
El portal (`index.html`) SHALL usar el diseño RPG compartido (`estilos/ui.css`) de Secundaria, Inglés y Juegos:
- con sesión, un encabezado tipo héroe con el saludo por nombre de pila, la fecha y, si existen, el avatar de Juegos y
  la etiqueta «Modo maestro»;
- tarjetas grandes por área según `/perfil` (Inglés, Mi ruta del profe, Secundaria y Juegos), cada una con su color,
  su emoji, un botón principal real y una línea de estado solo cuando el dato ya existe en lo que el portal pide;
- el avance RPG de la persona solo con datos que ya tiene el portal; si no hay datos, no se muestra;
- «🗓️ Mi horario» de Secundaria con el mismo estilo;
- sin sesión, la entrada con el mismo estilo y sus funciones: contraseña, «¿Olvidaste tu contraseña?», invitación a
  Juegos con correo desconocido, «Crea tu cuenta de Juegos» e `index.html?juegos=1`;
- un selector de tema (automático, oscuro, claro) guardado en `stald_tema`;
- en el pie, los enlaces al aviso de privacidad y al consentimiento solo con el interruptor `privacidad` encendido.

El portal SHALL tener botones de al menos 44 px con foco visible, funcionar en claro, oscuro y con `data-theme`, sin
scroll horizontal a 360 px, con contraste AA, y SHALL hacer las mismas peticiones que antes del cambio.

Matriz de acceso: sin cambios. Cada persona ve solo lo que `/perfil`, `/juegos/yo` y `/secundaria/actividades` ya le
devolvían; el selector de alumna o alumno de Secundaria solo aparece al admin.

#### Scenario: Alumna de Secundaria a 360 px
- **WHEN** una alumna de Secundaria entra al portal en un celular de 360 px en modo oscuro
- **THEN** ve el héroe con su nombre, su semana y su racha, las tarjetas de Secundaria («N clases hoy») y Juegos con
  botones de al menos 44 px, y su horario, sin scroll horizontal

#### Scenario: Alumno de Inglés sin datos RPG en el portal
- **WHEN** un alumno solo de Inglés entra al portal
- **THEN** ve las tarjetas de Inglés y Juegos y el atajo de Material, sin nivel ni XP inventados

#### Scenario: Invitado de Juegos
- **WHEN** un invitado registrado de Juegos entra al portal
- **THEN** ve el héroe con su apodo y solo la tarjeta de Juegos con su línea de puntos de la semana

#### Scenario: Admin
- **WHEN** el profe entra al portal
- **THEN** ve «Modo maestro», las tarjetas de Inglés, Mi ruta, Secundaria con selector de alumna o alumno y Juegos, y
  el bloque para restablecer contraseñas
- **AND** al elegir otra persona en el selector, el botón de Secundaria abre su tablero sin pedir nada al servidor

#### Scenario: Sin sesión
- **WHEN** alguien abre el portal sin sesión
- **THEN** ve la entrada con correo, contraseña, «¿Olvidaste tu contraseña?», «Crea tu cuenta de Juegos» y el selector
  de tema, con el mismo estilo

#### Scenario: Tema elegido
- **WHEN** alguien elige el tema oscuro en el portal con el sistema en claro
- **THEN** el portal se pinta oscuro y la elección se conserva al recargar y en Inglés y Juegos

#### Scenario: Interruptor de privacidad apagado
- **WHEN** el interruptor `privacidad` está apagado
- **THEN** el pie no muestra los enlaces al aviso de privacidad ni al consentimiento
