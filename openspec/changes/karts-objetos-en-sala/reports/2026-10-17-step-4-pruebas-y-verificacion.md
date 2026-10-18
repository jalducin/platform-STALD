# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: karts-objetos-en-sala
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --detalle --archivo juegos/karts --archivo tests/e2e/e2e-karts-vivo`
  contra la versión de `origin/main` para comparar)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9951 --puerto-web 9961 karts karts-vivo`
- Para iterar: `KARTS_VIVO_SOLO=objetos …` (sala de 3 con ítems + respaldo) y `KARTS_VIVO_SOLO=fps [KARTS_VIVO_MAPA=…]
  [KARTS_VIVO_SIN_ITEMS=1] …` (solo los fps de 8 en vivo)

## Resultados de pruebas
- Unitarias `server/karts_objetos_test.ts`: 8 pasaron (tablas por modo y lugar, codificar/decodificar, simulación
  determinista con el evento recibido 250 ms tarde, cohete, choque del lado de la víctima, rayo por historial,
  repetidos/viejos/1 por segundo, gracia y peor caso 1.76× < límite de cada pista aun manejando 30 % más lento).
- Suite Deno completa (tras mezclar `origin/main` con la Copa Reinos Antiguos): 715 pasaron, 0 fallaron, 6 omitidas;
  lint y check sin errores.
- Calidad: 15 avisos en `juegos/karts*` y `e2e-karts-vivo.js`, los mismos 15 que en `origin/main` (ninguno nuevo; dos
  S2681 que aparecieron se corrigieron).
- E2E (corrida completa tras la mezcla): `karts` 283/285 y `karts-vivo` 95/96. Las 3 fallas son lecturas de fps con
  CPU ×4 en pistas pesadas (Nebulosa 54 y Giza 53 en individual, donde este cambio no corre código nuevo; Nebulosa en
  vivo 32). La máquina tenía carga ajena (otros agentes con sus E2E; la corrida anterior dio 20–46 fps en todas las
  pistas individuales, incluida la Pradera). Repetición aislada de la Nebulosa con 8 en vivo: 48 fps **con** ítems y
  48 fps **sin** ítems (`KARTS_VIVO_SIN_ITEMS=1`): los ítems no cuestan cuadros.
- Sección nueva `objetosEnSala` (sala de 3 con relevo de 60 ms, 3 % de pérdida y 10 % de desorden): todo PASS
  — 7 ítems por lugar, rayo (A y B frenados, C no), cohete de A a B (B gira, A lo ve girar, desaparece en las 3),
  cáscara (misma posición < 2 px en otra pantalla, C la pisa y gira, desaparece en las 3), estrella (B inmune),
  anti-abuso (viejo, repetido y 1 por segundo descartados), sin objetos repetidos, cada aviso llega dos veces y la copia
  se descarta; respaldo sin canal con tabla reducida.
- Duración: ≈ 25 min la corrida completa `karts karts-vivo`.

## Rendimiento (60 fps, CPU ×4)

| Medición | fps |
| --- | --- |
| 8 en vivo, Pradera, ≈ 26 ítems en la pista (cáscaras, bolas y cohetes) | 60 |
| 8 en vivo dentro de El Castillo con ≈ 22 ítems | 57 |
| 8 en vivo, Nebulosa, con ítems / sin ítems (misma carga) | 48 / 48 |

## Verificación de estado
- Antes: la copia de datos de prueba la crea `correr.sh` en una carpeta temporal; Postgres no se usa.
- Después: `correr.sh` borra la copia temporal; nunca se escribió en tablas `stald_`.
- Estado restaurado: Sí — sin acciones extra.

## Resultado
- Estado Step 4: PASS (con la nota de fps bajo carga ajena; sin regresión atribuible a este cambio).
- Bloqueos: ninguno.
