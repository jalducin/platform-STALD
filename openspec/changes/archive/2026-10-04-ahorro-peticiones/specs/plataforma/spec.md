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

## MODIFIED Requirements

### Requirement: Aviso por correo cuando el servidor se bloquea
El servidor SHALL exponer `GET /salud` con el estado del límite de GitHub y del repo de datos, sin datos privados.
Un vigilante SHALL revisarlo cada 30 minutos (antes 15; cambio `ahorro-peticiones`) y SHALL avisar por correo al
profe (vía un issue que lo menciona) cuando el servidor esté bloqueado o cerca del límite, y SHALL avisar cuando se
recupere.

#### Scenario: Servidor bloqueado
- **WHEN** el límite de GitHub se agota o el servidor no responde
- **THEN** se abre el issue "🔴 Servidor bloqueado" mencionando a @jalducin, con la hora de reinicio, y le llega el
  correo de GitHub

#### Scenario: Cerca del límite
- **WHEN** quedan menos del 10 % de las lecturas de la hora
- **THEN** se abre "⚠️ Cerca del límite de GitHub"

#### Scenario: Recuperado
- **WHEN** el estado vuelve a ok con un aviso abierto
- **THEN** el vigilante comenta "✅ Recuperado" y cierra el aviso

#### Scenario: Sin spam
- **WHEN** el servidor sigue bloqueado en varias revisiones seguidas
- **THEN** no se agregan comentarios repetidos mientras el estado no cambie
