# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-17 (corrida terminada el 2026-10-18)
- Cambio: profe-semanas-del-grupo
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/profe_test.ts` (antes de implementar: 1 falla esperada; después: 9 pasan)
- `deno test -A server/`
- `deno check server/main.ts`
- `deno lint server/`
- `CHROME=<chrome.exe> bash tests/e2e/correr.sh --datos <copia del repo de datos sin la ruta C1> --puerto-api 8847 --puerto-web 8845 actividades-datos pronunciacion profe-grupo ruta-profe profe-diseno`
- Servidor local (`DATA_DIR` = copia temporal del repo de datos, `ROWS_FIXTURE`, `PERMITIR_HOY=1`) y `curl` con sesión de prueba
  a `/ingles/profe/actividades` y `/ingles/actividades` (ver verificación manual).

## Resultados de pruebas
- Dirigidas (`profe_test.ts`): 9 pasaron, 0 fallaron (2 nuevas: sin ruta propia → semana del grupo y `plan: null`;
  con ruta propia → conserva su semana).
- Suite completa (`deno test -A server/`): 774 pasaron, 0 fallaron, 6 ignoradas. `deno check`: sin errores.
- `deno lint server/`: los mismos avisos `no-import-prefix` que ya tenía `main` en los `*_test.ts`; el cambio no agrega
  ninguno nuevo.
- E2E (fase inglés): `actividades-datos` 6/6, `profe-grupo` 7/7, `ruta-profe` 11/11, `profe-diseno` 10/10 PASS;
  `pronunciacion` OMIT (los datos ya no tienen actividad de pronunciación).
- Duración: unidad ≈ 2 min 20 s; E2E ≈ 1 min.

## Verificación de estado
- Antes: `contenido/profe/` con 29 archivos (plan, 5 semanas, 13 actividades, 10 exámenes); 0 intentos del profe en
  ellos; 5 resultados del profe en elementos del grupo (`resultados/<id>/profe.json`).
- Después: `contenido/profe/` y `herramientas/profe-mes-1/` eliminados (commit del repo de datos «profe: elimina la
  ruta B1 → C1»); los 5 resultados del profe siguen intactos.
- Las E2E y la verificación local corren sobre copias temporales; el repo de datos no se modifica.
- Estado restaurado: Sí. Copias temporales borradas y servidor local detenido.

## Verificación manual (servidor local, copia de datos)
- Profe, hoy 2026-10-18: `plan: null`, `semana` 2026-10-12 (del grupo), `semanaSiguiente` 2026-10-19; 28 elementos,
  todos `grupo: true`, sin Meet ni `profe-*`.
- Profe, hoy 2026-10-25 (domingo): `semanaSiguiente` 2026-10-26; la semana 5 ya se puede resolver, con fecha del día
  anterior a que abra al grupo (act 27 y 29 → 25; tec → 28; examen → 29; refuerzo → 30).
- Profe, hoy 2026-10-27: `semana` 2026-10-26 «Semana 5 · El verbo to be»; abrir `act-2026-10-27` da 12 preguntas
  (opción, ordenar, emparejar), intento 1.
- Alumno o alumna del registro: 403 en la ruta del profe; su semana 2026-10-26 sin elementos `profe-*`.
- Admin del grupo, hoy 2026-10-24: la semana 5 aún no aparece (se ve desde el domingo 25).

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
