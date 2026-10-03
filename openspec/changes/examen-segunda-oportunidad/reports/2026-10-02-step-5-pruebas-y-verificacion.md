# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-02
- Cambio: examen-segunda-oportunidad
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- `npx deno run --allow-read server/validar_semana.ts <datos> 2026-09-28` (con el examen actualizado)
- Servidor local con `PERMITIR_HOY=1` y copia desechable del repo de datos; estáticos en `localhost:8765`
- `node e2e-segunda-oportunidad.js` (nuevo; fechas simuladas agregando `&hoy=` a las peticiones y fijando el
  reloj del navegador) y regresiones `e2e-ruta-profe` y `e2e-profe-grupo`

## Resultados de pruebas
- Dirigidas (TDD, `server/segunda_oportunidad_test.ts`): 4 pruebas.
  - Primero en rojo: 2 fallaron (espera y validación); las de entrega tarde y del profe ya pasaban. Luego en verde.
  - Se ajustó la prueba de validación: limpia la caché entre las dos semanas que compara.
- Suite del servidor: 114 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- Contenido: `examen-2026-10-02` con `intentos: 2` y `segundaOportunidad: 2026-10-04`. Validador: 0 errores
  (1 aviso previo: falta el enlace del Meet).
- E2E `e2e-segunda-oportunidad`: 8/8 PASS.
  - Viernes: el examen muestra 0/2 y Resolver. Al enviar aparece el aviso «2.ª oportunidad el dom 4 de oct» y no
    hay botón de reintento.
  - Sábado: en espera, con «2.ª oportunidad dom 4 de oct» y Ver resultado. La API responde `segunda_pronto`.
  - Domingo: botón «2.ª oportunidad» y selección nueva (5 de 20 preguntas nuevas, el máximo posible con un banco
    de 30 es 10). No es corrección. 100 % y «intento 2 de 2 · mejor: 100%».
- Regresiones: `e2e-ruta-profe` 15/15 y `e2e-profe-grupo` 7/7.
  - La primera corrida de `e2e-profe-grupo` falló porque la copia de datos ya traía los intentos reales del profe
    en las 5 actividades del grupo (100, 100, 91, 95 y 100 %).
  - Sin esos archivos pasó completa. No es una regresión.

## Verificación de estado
- Copias desechables (`data-so`) recreadas antes de cada corrida; el repo de datos real no se tocó en las pruebas.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno

## Step 6 — Verificación manual en producción (EL AGENTE EJECUTA)
- El contenido se subió después de que terminó el despliegue, para que el servidor viejo nunca ofreciera el
  reintento inmediato.
- Solo GET contra `https://stald.jalducin.deno.net`:
  - Vista del grupo: `examen-2026-10-02` con `intentosMax` 2 y `segundaOportunidad` 2026-10-04. Ya tiene 1
    resultado del grupo (Sofy, 1 intento, 55 %), que podrá mejorar el domingo.
  - Ruta del profe: el mismo examen sin espera (`en-curso`, 1/2): el profe puede hacer su 2.ª oportunidad cuando
    quiera.
- Estado: sin escrituras de prueba.
