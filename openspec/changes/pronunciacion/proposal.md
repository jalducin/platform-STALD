## Why

El profe pidió (2026-10-01) una **tercera actividad por semana: pronunciación**. Hoy el motor solo tiene
ejercicios de opción múltiple y de escribir, así que no hay cómo escuchar un modelo ni practicar en voz alta.

## What Changes

- **Motor (cualquier ámbito):**
  - campo opcional `audio` en un ejercicio: la página lo lee en voz alta (🔊 normal y 🐢 lento) con la voz en
    inglés del navegador. Sirve para pares mínimos ("Which word do you hear?") y para dictados cortos;
  - tipo nuevo `pronunciar` con `frase`: quien estudia escucha el modelo y la dice en voz alta. El
    reconocimiento de voz del navegador la transcribe y el servidor califica la coincidencia de palabras
    (≥ 80 %), con contracciones equivalentes (I've = I have);
  - si el navegador no reconoce voz, se autoevalúa: "✔ Me salió bien" / "↺ Necesito repetir".
- **Ruta del profe:** una actividad de pronunciación **los viernes** en las semanas 0–4 (5 actividades):
  - semana 0: sonidos de lo que enseñas (vocales del alfabeto, -s /s/ /z/ /ɪz/, th);
  - semana 1: -ed /t/ /d/ /ɪd/ y formas débiles de have/been;
  - semana 2: contracciones 'll/'d, /ɪ/ vs. /iː/ y acento de palabra;
  - semana 3: /b/ vs. /v/, formas débiles en la pasiva y acento de oración;
  - semana 4: must've / can't have, schwa, linking y /ʃ/ vs. /tʃ/.
  - El patrón del profe queda lun / mié / jue / vie / sáb, y `plan.json` se actualiza.

## Capabilities

### Modified Capabilities
- `ingles`: ejercicios de audio y pronunciación.

## Impact

- **Código:** `server/motor.ts` (tipo, calificación, validación), `server/semana.ts` (patrón del profe) e
  `ingles.html` (reproductor).
- **Repo de datos:** `contenido/profe/actividades/profe-pron-<fecha>.json`, generador y `plan.json`.
- **Privacidad:** el reconocimiento de voz de Chrome envía el audio a los servidores de Google para
  transcribirlo. No se guarda audio en la plataforma, solo el texto reconocido como respuesta.
- **Acciones externas:** redeploy al hacer merge, subir el contenido y verificar en producción.
