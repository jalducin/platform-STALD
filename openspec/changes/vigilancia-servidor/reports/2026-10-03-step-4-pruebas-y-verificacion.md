# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-03 (UTC) · 2026-10-02 noche (CDMX)
- Cambio: vigilancia-servidor
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts server/vigilancia.ts`
- `SIMULAR=1 FORZAR=<estado> ABIERTO_SIM='[…]' deno run --allow-net --allow-env server/vigilancia.ts` (sin escribir en
  GitHub)
- Validación del YAML del workflow con PyYAML

## Resultados de pruebas
- `server/salud_test.ts` (3):
  - ok con los números y el reinicio, sin el token;
  - advertencia con menos del 10 %;
  - bloqueado con 0 restantes o con el repo fallando;
  - sin datos del límite decide por el repo.
  - Se escribieron antes que `server/salud.ts`, pero **no se corrieron en rojo** (se omitió ese paso).
- `server/vigilancia_test.ts` (4): crear, cambiar o no hacer nada sin repetir, cerrar al recuperarse, y la hora en
  CDMX. Primero en rojo (sin el módulo) y luego en verde.
- Suite del servidor: 127 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- Simulación del vigilante:
  - bloqueado con un aviso de advertencia abierto → comenta y cambia el título;
  - advertencia igual a la abierta → nada;
  - ok con un aviso abierto → comenta «✅ Recuperado» y cierra;
  - contra `/salud` de producción (antes del despliegue) → «caído», porque la ruta aún no existía, como se esperaba.

## Verificación de estado
- Sin escrituras: las simulaciones no tocan GitHub.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno

## Step 5 — Verificación manual en producción (EL AGENTE EJECUTA)
- `GET /salud` → 200 `{ ok: true, estado: "ok", github: { limite: 5000, usadas: 0, restantes: 5000 } }`. El token del
  servidor no había gastado lecturas en la hora, lo que concuerda con el arreglo de ETag.
- Corridas a mano del workflow "Vigilancia del servidor":
  1. revisión real → `estado: ok`, decisión `nada` (sin aviso);
  2. `forzar=bloqueado` → se abrió el issue #65 «🔴 Servidor bloqueado» mencionando a @jalducin (correo de prueba
     de GitHub);
  3. `forzar=ok` → comentó «✅ Recuperado» y cerró el #65.
- La programación cada 15 min queda activa en `main`.
