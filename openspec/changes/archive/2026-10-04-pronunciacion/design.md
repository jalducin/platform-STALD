## Decisiones

### 1. Modelo de datos
- `Ejercicio.audio?: string`: texto que la página sintetiza (en-US). Va en la vista pública, porque la
  página lo necesita. Es aceptable para práctica, pero no se usa en exámenes donde el audio revele la
  respuesta.
- `tipo: "pronunciar"` con `frase` (obligatoria; el validador lo revisa). `frase` es pública, porque es lo
  que hay que decir.

### 2. Calificación (`server/motor.ts`)
- La respuesta es el texto reconocido (≤ 300 caracteres), o `auto:ok` / `auto:repetir` (autoevaluación).
- Normalización:
  - minúsculas, sin acentos ni puntuación;
  - se expanden las contracciones `n't → not`, `'ve → have`, `'ll → will`, `'re → are`, `'m → am`,
    `'d → would` (y `can't → can not`, `won't → will not`);
  - los números escritos en dígitos quedan como están.
- Coincidencia = LCS de palabras entre la frase y lo reconocido ÷ palabras de la frase. Es correcta si es
  ≥ 0.8.
- `auto:ok` cuenta como correcta y `auto:repetir` como incorrecta. En la revisión se muestra "Autoevaluación".
- En la revisión, "tu respuesta" es lo que se reconoció y "correcta" es la frase.

### 3. Página (`ingles.html`)
- Botones 🔊 y 🐢 (`speechSynthesis`, en-US, velocidad 1 y 0.7) en cualquier ejercicio con `audio` y en
  los de `pronunciar`.
- `pronunciar` con `SpeechRecognition` / `webkitSpeechRecognition` (en-US):
  - 🎙️ "Decirlo" muestra "Te escuché: …" y la coincidencia calculada en el cliente con el mismo algoritmo;
  - se puede repetir; cuenta el último intento;
  - el texto va en un campo oculto `q-text`, así el progreso y el envío funcionan igual.
- Sin reconocimiento: botones de autoevaluación y un aviso ("usa Chrome o Edge para calificar tu voz").

### 4. Contenido
- Cada actividad de pronunciación tiene 12 ejercicios:
  - 4 de escuchar (pares mínimos con `audio`);
  - 3 de teoría de sonidos (acento, terminaciones, IPA);
  - 5 frases para `pronunciar`, ligadas a la gramática de la semana.
- Lleva 2 temas: `sonidos` (escuchar y reconocer) y `habla` (pronunciar).
- Fechas: viernes 2, 9, 16, 23 y 30 de octubre. Id `profe-pron-<fecha>`.
