## ADDED Requirements

### Requirement: Borrador de la entrega de texto en la cuenta
Mientras alguien escribe la entrega de un paso de una misión principal (Secundaria o Inglés, como My Hero Card), la
plataforma SHALL guardar el texto en el servidor como borrador, por persona, misión y paso
(`PUT /misiones/<id>/borrador { paso, texto }`, ruta `borradores/misiones/<id>/<slug>.json`), a los pocos segundos del
último cambio, al salir del cuadro, al ocultar la pestaña y al volver la conexión, y SHALL guardar también una copia en
el aparato. `GET /misiones` SHALL devolver el borrador solo a su dueña o dueño; al abrir la misión SHALL ganar la copia
más reciente. El borrador NO SHALL ser entrega: no aparece en «📥 Entregas», no da XP y el admin no SHALL leerlo ni
escribirlo (403). SHALL respetar el límite de 4 000 caracteres (400 `borrador_invalido`), solo texto, y una misión
evaluada SHALL responder 409 salvo en el paso que está en corrección. Al entregar el paso, su borrador SHALL borrarse. El
texto del borrador SHALL borrarse con «Borrar todas sus entregas» y con la retención del 31 de agosto, y la copia del
aparato con «Cerrar sesión». La página SHALL mostrar «Guardando…», «💾 Guardado hace N s» o, si no se pudo guardar,
«📴 No se pudo guardar en tu cuenta… 🔄 Reintentar».

#### Scenario: Otro navegador recupera el texto
- **WHEN** Laura escribe la ficha de su héroe en el celular sin entregarla y luego abre la misión en la computadora
- **THEN** el cuadro del mismo paso tiene su texto

#### Scenario: No es entrega
- **WHEN** hay borrador de un paso sin entregar
- **THEN** la misión no tiene entrega de ese paso y el profe no la ve en «📥 Entregas»

#### Scenario: Sin red
- **WHEN** la alumna escribe sin conexión
- **THEN** ve «📴 No se pudo guardar…» con «🔄 Reintentar», el texto sigue en el aparato y se sube al reintentar

#### Scenario: Entregar limpia el borrador
- **WHEN** la alumna toca «📤 Entregar paso»
- **THEN** el paso queda entregado y ya no hay borrador de ese paso

#### Scenario: Matriz de acceso
- **WHEN** el admin, una persona de baja o un invitado escriben un borrador, u otra persona lo intenta con una misión que no es suya
- **THEN** reciben 403 (admin, baja, invitado) o 404 (misión ajena) y no se guarda nada

#### Scenario: No se pisan
- **WHEN** la misma persona tiene a la vez borrador de una misión y de una actividad
- **THEN** cada uno conserva su contenido
