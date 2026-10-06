## ADDED Requirements

### Requirement: Ayuda y reenvío cuando no llega el enlace
El paso del código de la entrada con enlace SHALL ayudar a quien no recibe el correo. Ese paso
(`pintarEntrada` de `comun/auth.js`, usado por Juegos, Inglés y Secundaria, y el paso propio del portal) SHALL mostrar debajo del formulario: «¿No te llegó? Revisa tu carpeta de
spam o promociones. Si en un par de minutos no aparece, pide uno nuevo. También puedes pedirle a tu profe tu enlace
de acceso por WhatsApp.» y un botón «📧 Reenviarme el enlace» que llame otra vez a `enviarEnlace(correo)`. Tras
cada envío el botón SHALL quedar deshabilitado 60 s con «Puedes pedir otro en N s». SHALL mostrar el éxito del
envío o el mensaje de error tal cual. En el modo de prueba (verificador falso) SHALL funcionar sin red.

#### Scenario: Ayuda visible
- **WHEN** la persona pide el enlace y llega al paso del código
- **THEN** ve la ayuda «¿No te llegó?» y el botón «📧 Reenviarme el enlace» deshabilitado con «Puedes pedir otro en … s»

#### Scenario: Reenviar
- **WHEN** termina la espera y la persona toca «📧 Reenviarme el enlace»
- **THEN** se vuelve a mandar el enlace al mismo correo, se avisa «Te mandamos otro enlace» y el botón vuelve a esperar 60 s

#### Scenario: Error al reenviar
- **WHEN** el envío falla (por ejemplo, por el límite de envíos)
- **THEN** se muestra el mensaje de error tal cual y el botón se habilita de nuevo
