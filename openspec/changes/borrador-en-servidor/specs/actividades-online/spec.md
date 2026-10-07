## ADDED Requirements

### Requirement: Avance del examen guardado en la cuenta
Mientras alguien contesta un intento, la plataforma SHALL guardar su avance en el servidor, asociado a su cuenta y
a ese intento. Al volver a abrirlo desde cualquier aparato o navegador SHALL recuperar las respuestas. Al enviar el
intento, el borrador SHALL borrarse. Nadie más SHALL poder leer ni escribir ese borrador.

#### Scenario: Otro aparato
- **WHEN** Sofía contesta 30 preguntas en su celular y luego abre el examen en la computadora
- **THEN** ve sus 30 respuestas recuperadas y sigue donde se quedó

#### Scenario: Se borra el navegador
- **WHEN** el navegador pierde sus datos locales a mitad del examen
- **THEN** al volver a abrirlo recupera el avance guardado en su cuenta
