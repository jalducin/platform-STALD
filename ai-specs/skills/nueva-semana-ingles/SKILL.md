---
name: nueva-semana-ingles
description: Prepara, valida y sube la clase de Inglés de la semana siguiente (actividades mar/jue, examen vie, refuerzo sáb, Meet dom con guion y presentación) al repo privado de datos. Úsala cuando pidan "armar/cargar la semana N", "la clase de la próxima semana" o den temas nuevos de Inglés.
author: platform-STALD
version: 1.0.0
---

# nueva-semana-ingles

Flujo para armar la clase de la semana siguiente, normalmente el fin de semana anterior. Spec:
`openspec/changes/nueva-semana-ingles` (capability `carga-semanal`). El formato de cada JSON está en
[docs/data-model.md](../../../docs/data-model.md) § "Actividades semanales". No lo copies aquí; léelo.

## Reglas que no se rompen

- **Privacidad.** El contenido (con respuestas) va solo al repo **privado** `jalducin/platform-STALD-data`.
  Trabaja en su copia del scratchpad, nunca dentro del repo público. No se permiten nombres ni correos de
  alumnos o alumnas en ningún texto. El correo de admin no se escribe en archivos.
- **No subir sin validación sin errores** (`server/validar_semana.ts`) **ni sin la aprobación del usuario.**
- **El examen del viernes queda bloqueado hasta su día**: `disponibleDesde` = su fecha.
- **Lenguaje inclusivo**: "alumnos y alumnas", "compañero o compañera".
- Instrucciones en español; contenido en inglés; nivel A1 salvo que el usuario diga otro.

## Paso 1: Fechas y temas

1. Calcula el **lunes siguiente** con la fecha real (no de memoria), porque es el id de la semana. Días:
   - mar: `act-<fecha>`
   - jue: `act-<fecha>`
   - vie: `examen-<fecha>`
   - sáb: `refuerzo-<fecha>`
   - dom: `meet-<fecha>`
2. Pide o confirma los temas de martes, jueves y domingo (texto o fotos del libro). Pregunta por días sin
   clase; si hay alguno, ajusta la semana. El validador avisará que el día no sigue el patrón, y eso es
   aceptable.
3. Si faltan, pide el enlace y la hora del Meet (`meetUrl`, `hora`).

## Paso 2: Repo de datos y avance del grupo

```bash
DATA=<scratchpad>/data
[ -d "$DATA/.git" ] && git -C "$DATA" pull -q || gh repo clone jalducin/platform-STALD-data "$DATA"
curl -s "https://stald.jalducin.deno.net/ingles/actividades?email=<correo-admin>"   # pedirlo si no lo sabes
```

- De la respuesta de admin, `resumen[alumno].temasAReforzar` indica qué temas débiles repasar. Mételos en
  la actividad del martes como mini-repaso (2–3 ejercicios) y en el guion del domingo.
- Revisa la semana anterior en `$DATA/contenido/` para no repetir ejercicios y mantener el estilo.

## Paso 3: Generar los 6 JSON

Escribe un generador en `$DATA/herramientas/semana-<lunes>/`. Usa como modelo
`herramientas/semana-2026-09-28/` (`gen_semana1.py` y `gen_meet.py`). El generador escribe:

| Archivo | Contenido clave |
|---|---|
| `contenido/semanas/<lunes>.json` | `id` = lunes, `titulo` "Semana N · <tema>", 5 `elementos` `{ id, tipo, fecha }` |
| `actividades/act-<mar>.json`, `act-<jue>.json` | `disponibleDesde` = lunes, `intentos` 2, `preguntasPorIntento` 12 (el intento 2 es corrección de los mismos ejercicios), banco ≥ 36 (≥ 12 por tema) para variar entre alumnos y alumnas, 2–3 `temas`, `teoria` (tablas + puntos), `tips` (≥ 2 `libreta` y ≥ 2 `video`) |
| `examenes/examen-<vie>.json` | `disponibleDesde` = `fechaLimite` = viernes, `intentos` 1, `preguntasPorIntento` 20, banco ~30 **nuevo** que cubra todos los temas de mar y jue |
| `actividades/refuerzo-<sáb>.json` | `basadoEn` examen del viernes, `respaldo` `diagnostico-a1`, `bancoDe` [act mar, act jue, examen], `mapeoTemas` (tema del examen o del diagnóstico → tema del refuerzo), `temas` de la semana, `banco: []` |
| `actividades/meet-<dom>.json` | `guion` (bloques con `tiempo`, `titulo`, `objetivo`, `pasos`), `teoria` de lo nuevo, `tips`, banco ≥ 20 del reto (10 por intento), `presentacion.diapositivas` |

Cada **tema** lleva `retroalimentacion` con `fortaleza`, `en-progreso` y `debilidad`. Cada **ejercicio**
lleva:
- `id` único con prefijo del archivo, `tema`, `enunciado` y `explicacion`;
- tipo `opcion` con `opciones` + `correcta`, o tipo `escribir` con `aceptadas`, que incluye variantes
  como contracciones ("don't", "do not").

Mezcla alrededor de 70 % `opcion` y 30 % `escribir`.

**Diapositivas soportadas** (`ingles.html`):
- `portada`, `agenda`, `retro` (automática, sin nombres);
- `teoria` con `ref` = índice en `teoria`;
- `practica` (`instrucciones`, `frases`), `juego` (`reglas`);
- `reto` (`url`, `pasos`), `libreta`, `cierre`.

Orden sugerido: portada → agenda → retro → (teoría → práctica)× → juego → reto → libreta → cierre.

## Paso 4: Validar

```bash
npx -y deno run --allow-read server/validar_semana.ts "$DATA" <lunes>
```

Debe salir con **0 errores** (código 0). Corrige y repite. Revisa los avisos. "Falta meetUrl" se acepta
si el usuario aún no lo tiene; recuérdaselo. Revisa a mano que ningún enunciado mencione a alguien del
grupo.

Vista previa local opcional (misma copia, sin tocar producción):

```bash
DATA_DIR="$DATA" ROWS_FIXTURE=<fixture> SUPER_ADMIN_EMAIL=admin@example.com PERMITIR_HOY=1 PORT=8787 npx -y deno run -A server/main.ts
curl "http://127.0.0.1:8787/ingles/actividades/act-<mar>?email=admin@example.com&hoy=<mar>"
```

## Paso 5: Resumen y aprobación

Muestra al usuario una tabla por día con título, temas, número de ejercicios e intentos. Agrega los temas
de repaso tomados del avance, los avisos del validador y 2–3 ejercicios de muestra. **Espera su "va".**

## Paso 6: Subir y verificar

```bash
git -C "$DATA" add -A && git -C "$DATA" commit -m "contenido: semana N (<lunes>)" && git -C "$DATA" push
```

- Antes del lunes, la lista de producción no debe incluir nada de la semana nueva, porque se publica sola
  su lunes. Compruébalo con el `curl` de admin del paso 2.
- El lunes, si el usuario lo pide, confirma que aparece: `semana` = `<lunes>` y 5 elementos nuevos.
- Recuerda al usuario el enlace y la hora del Meet si faltan. Se editan en `meet-<dom>.json`, y el
  servidor lo toma en menos de un minuto.
