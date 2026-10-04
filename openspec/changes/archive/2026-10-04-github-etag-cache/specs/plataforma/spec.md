## ADDED Requirements

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
