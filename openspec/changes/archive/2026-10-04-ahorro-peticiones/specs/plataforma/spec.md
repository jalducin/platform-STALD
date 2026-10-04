## ADDED Requirements

### Requirement: Menos peticiones por partida
Las páginas SHALL enviar sus POST sin provocar la verificación previa de CORS. Las salas SHALL consultar su estado cada
2.5 s solo cuando haga falta verse en tiempo real (sala de espera, ¡Una!, Basta, Lotería) y cada 5 s en los juegos de
preguntas. Una sala de espera que no empieza en 15 min SHALL dejar de consultar.

#### Scenario: Envío sin preflight
- **WHEN** un jugador envía una respuesta
- **THEN** el navegador hace una sola petición (sin `OPTIONS` previo) y el servidor la procesa igual

#### Scenario: Quiz a 5 s
- **WHEN** empieza una partida de Maratón de cultura
- **THEN** la página consulta el estado cada 5 s y las preguntas siguen sincronizadas

#### Scenario: Sala de espera olvidada
- **WHEN** pasan 15 min en la sala de espera sin que el anfitrión empiece
- **THEN** la página deja de consultar y muestra cómo volver a entrar
