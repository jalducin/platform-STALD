# plataforma Specification

## Purpose
Requisitos transversales del servidor: resiliencia ante el límite de GitHub, vigilancia con avisos por correo y ahorro de peticiones. Origen: github-etag-cache, vigilancia-servidor y ahorro-peticiones.
## Requirements
### Requirement: Almacén resiliente al límite de GitHub
El servidor SHALL usar peticiones condicionales (ETag) al leer el repo de datos, para que las lecturas sin cambios
no consuman el límite de la API. Si el límite se agota, SHALL servir la última copia conocida y, cuando no la haya,
SHALL responder 503 `mucho_trafico` con un mensaje claro, en lugar de un error genérico.

#### Scenario: Lectura sin cambios
- **WHEN** una partida consulta su estado y los archivos no cambiaron
- **THEN** GitHub responde 304, el servidor usa su copia y no se consume el límite

#### Scenario: Límite agotado con copia
- **WHEN** GitHub responde por límite agotado y el archivo ya se había leído
- **THEN** el servidor responde con la última copia conocida

#### Scenario: Límite agotado sin copia
- **WHEN** GitHub responde por límite agotado y no hay copia
- **THEN** el servidor responde 503 `mucho_trafico` y la página muestra "Hay mucha actividad; intenta de nuevo en
  unos minutos"

### Requirement: Aviso por correo cuando el servidor se bloquea
El servidor SHALL exponer `GET /salud` con el estado del límite de GitHub y del repo de datos, sin datos privados.
Un vigilante SHALL revisarlo cada 15 minutos y SHALL avisar por correo al profe (vía un issue que lo menciona)
cuando el servidor esté bloqueado o cerca del límite, y SHALL avisar cuando se recupere.

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

