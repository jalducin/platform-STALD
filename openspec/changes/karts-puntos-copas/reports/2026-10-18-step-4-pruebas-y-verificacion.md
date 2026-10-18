# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-puntos-copas (sprint 41, parte 1: puntos de las copas)
- Agente: Claude (agente de puntos), con las pruebas del agente de pruebas (`test/karts-puntos-copas`, 9ccbe2e)

## Diagnóstico

- Con un avance limpio no se reproduce: ganar la carrera 1 de las 4 copas deja +15, «Copa 15», `PUT` 200, `POST
  /juegos/partida` 200 y, tras recargar, «Continuar … Carrera 2 de 4 · ⭐ 15 pts (1.º)». También con una carrera
  completa de Reinos a velocidad real con el piloto de prueba y en la Copa Reinos en sala (Marisol 15).
- Defectos confirmados (rojos en `origin/main`, verdes aquí):
  1. Récord de más de 15 min (reloj de pared: pestaña oculta o atorado) → `400 progreso_invalido` y se pierde la
     copa en curso, en cualquier copa. Arreglo en el cliente: `KartsPistas.anotarRecord` no anota tiempos fuera del
     rango que acepta el servidor (que sigue sin aceptarlos).
  2. Tiempo de la copa en sala rechazado (`carrera_invalida`) sin aviso. Ahora el juego avisa «No se guardó tu tiempo
     de esta carrera: …».
- No hay acceso a los datos de producción para confirmar cuál le tocó al profe.

## Comandos ejecutados

- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --detalle --archivo …` en los archivos tocados)
- `KARTS_SOLO=reinos bash tests/e2e/correr.sh --datos <copia> --puerto-api 10053 --puerto-web 10063 karts karts-puntos`
- `KARTS_SOLO=puntos KARTS_VIVO_SOLO=copa-reinos bash tests/e2e/correr.sh --datos <copia> --puerto-api 10053 --puerto-web 10063 karts karts-vivo`
- Antes del merge de `origin/main` (con la reversa): `correr.sh … karts karts-vivo mando espectador`

## Resultados de pruebas

- Deno: 815 pasan, 0 fallan, 6 omitidas (incluye `karts_puntos_copas_test.ts`, 23, y `karts_puntos_reglas_test.ts`).
  Sobre `origin/main`, los de récords de más de 15 min y las reglas compartidas fallan.
- Lint: limpio (133 archivos). Calidad: sin avisos nuevos en los archivos tocados (los S3776 que aparecen son de
  funciones que este cambio no toca).
- E2E tras el merge de `origin/main`: `karts` (Reinos) 35/0, `karts-puntos` 28/0, `karts` (puntos de las 4 copas)
  32/0, `karts-vivo` (Copa Reinos en sala) 3/0.
- E2E previa completa: `mando` 64/0 y `espectador` 28/0. En `karts` y `karts-vivo` las únicas fallas fueron de fps con
  CPU ×4 (53, 50, 48, 46: la máquina corría 4 suites y Deno a la vez) y un «KP.anotarRecord is not a function»
  provocado por el propio agente al regresar temporalmente `karts-pistas.js` a `main` para comprobar el rojo; con la
  máquina libre, Reinos (fps incluido) pasa.

## Verificación de estado

- Antes: copia temporal del repo de datos (`correr.sh` copia y borra al terminar).
- Después: copia borrada; el repo de datos original no se modifica.
- Estado restaurado: Sí. Nunca se escribió en tablas `stald_`.

## Capturas revisadas (390×844)

- `karts-puntos-reinos-recarga.png`: menú tras recargar con «Continuar Copa Reinos Antiguos · Carrera 2 de 4 · ⭐ 15 pts (1.º)».
- `karts-puntos-sala-reinos.png`, `karts-vivo-copa-reinos-tabla.png`: tabla entre carreras con +15.
- `karts-puntos-sala-rechazada-reinos.png`: copa en sala con el tiempo rechazado (aviso detectado por la prueba).

## Resultado

- Estado Step 4: PASS
- Bloqueos: ninguno
