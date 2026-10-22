# Reporte Step 5: pruebas y verificación de estado

- Fecha: 2026-10-22
- Cambio: presentacion-cabe
- Agente: Claude Code (Opus 5.5). Las pruebas largas las corrió el subagente `verificador-pruebas` y la segunda
  lectura la hizo `revisor-solo-lectura`.

## Comandos ejecutados

- `npx -y deno test -A server/`, `npx -y deno check server/main.ts` y `npx -y deno lint server/`
- `TAMANOS=todos bash tests/e2e/correr.sh --datos <copia temporal de platform-STALD-data> --puerto-api 9011 --puerto-web 9012 presentacion-cabe presentar teoria-diagramas ingles-admin ingles-diseno-profe`
  (sin `--pg`: no se tocó ninguna tabla `stald_`)
- Antes del arreglo, la misma E2E contra el código de `main`: 24 FAIL de 48 pasos. Todos los recorridos de
  diapositivas tenían contenido cortado; los 24 PASS eran de la navegación con ←.

## Resultados de pruebas

- Unitarias (`deno test`): 1071 pasaron, 0 fallaron, 6 omitidas. `deno check` y `deno lint` (175 archivos), sin
  hallazgos.
- E2E dirigidas, después de atender la revisión:
  - `presentacion-cabe` (6 tamaños, 3 Meets reales y 1 sintético): 55 PASS, 0 FAIL.
  - `presentar`: 11 PASS. `teoria-diagramas`: 42 PASS. `ingles-admin`: 16 PASS.
- `ingles-diseno-profe`: 91 PASS y 2 FAIL («🌍 Mundos …»: con esta copia de datos solo 2 mundos tienen clases). Falla
  igual en `origin/main` (9c66706), así que no la causa este cambio.
- Duración: unitarias 1 min 18 s. `presentacion-cabe` con `TAMANOS=todos`: unos 4 min.

## Verificación de estado

- Antes: sin estado mutable. La E2E es de solo lectura (abre presentaciones como admin) y la presentación sintética
  se sirve con `page.route`.
- Después: `correr.sh` borró su copia temporal de datos. La copia clonada del repo de datos está fuera del repo y no se
  modificó.
- Estado restaurado: no aplica (sin escrituras).

## Verificación manual (Step 6)

Recorrido de todas las diapositivas en Playwright con capturas (`CAPTURAS=1`):

- Tamaños: 1280×720, 1366×768, 1920×1080, 1024×768, 360×740 y 740×360.
- Casos revisados:
  - teoría larga en partes («⬇️ Hay más · parte 1/3» → «✅ Parte 3/3 · → sigue»);
  - ← sube una parte;
  - clic en el aviso;
  - cambio de tamaño con la presentación abierta;
  - Enter sobre ☀️/🌙;
  - tema oscuro con sistema oscuro y T → claro;
  - botones «Anterior» y «Siguiente» y `aria-valuenow`.
- Las capturas de antes y después quedaron fuera del repo, en la carpeta temporal de la sesión.

## Resultado

- Estado Step 5: PASS
- Bloqueos: ninguno. La falla de `ingles-diseno-profe` ya existía y depende de los datos.
