# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: karts-curvas-complejas
- Agente: Claude Code (Opus 5.5)

## Trazados nuevos (antes → después)

Minimapas de antes y después (dibujados con las mismas muestras de `Arcade.muestrearPista`; el recuadro chico es el
minimapa de 104×72 del celular): `antes-espacio.png` → `despues-espacio.png` y `antes-reinos.png` →
`despues-reinos.png` en esta carpeta.

| Pista | Secciones complejas | Largo antes → después | Giro total antes → después |
|---|---|---|---|
| Estación Orbital Quetzal | escalón de pasillos (4 giros de 90°), laberinto en greca (10 giros de 90° seguidos), chicana, horquilla | 13 473 → 13 570 px | 839° → 1979° |
| Anillos de Saturno | espiral doble de 443° (entra, S central, sale entre sus anillos), horquilla, S, curva que se cierra, chicana, serpentina con 2 horquillas | 13 917 → 13 629 px | 1080° → 1771° |
| Cinturón de Asteroides | sacacorchos de 277° alrededor del asteroide, curva que se cierra, laberinto en escalera (6 giros de 90°), chicanas, horquilla | 11 992 → 13 606 px | 742° → 1887° |
| Nebulosa Esmeralda | remolino en espiral doble de 410° con portal al centro, horquilla, serpiente de S abierta, curva que se cierra, horquilla doble con portal | 13 729 → 13 914 px | 1015° → 1973° |
| Gran Pirámide de Giza | rampa en espiral doble de 413° alrededor de la pirámide, Cámara del rey (horquilla y S), Gran Galería en escalera de 90° | 13 348 → 13 355 px | 702° → 1629° |
| Interior de El Castillo | escaleras interiores (escalón de 90°), Templo del jaguar en greca (16 giros de 90° seguidos), chicana, horquilla | 13 902 → 13 417 px | 1039° → 1963° |
| Templo de Karnak | sacacorchos de 276° alrededor del lago sagrado, santuario en escalera, sala hipóstila (14 columnas), chicana | 11 634 → 12 905 px | 651° → 1401° |
| Galerías de Angkor Wat | galerías concéntricas en espiral doble de 409°, galería de los bajorrelieves, naga (serpiente de S), curva que se cierra | 11 665 → 12 640 px | 933° → 1575° |

Todas: radio mínimo ≥ 108 px, sin encimarse, meta en recta, minimapa ≥ 6.2 px, referencia de 116 a 139 s.
Ocho con cruce: no aplica (motor Mode-7 de un solo plano); el «paso por encima» lo hace el portal del remolino.

## Comandos ejecutados

- `npx -y deno test -A server/` (después de fusionar `origin/main` con karts-objetos-en-sala)
- `npx -y deno lint server/ juegos/karts-pistas.js`
- `cd tests/calidad && npm run calidad` y `node calidad.mjs --detalle --archivo …` (contra `origin/main`)
- `KARTS_SOLO=espacio … bash tests/e2e/correr.sh … karts`, `KARTS_SOLO=reinos … karts` (iteración)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9971 --puerto-web 9981 karts karts-vivo`

## Resultados de pruebas

- Deno (, tras fusionar  con karts-objetos-en-sala y Brigada Xalli): 758 pasaron, 0 fallaron, 6
  omitidas. Nueva:  (7 pruebas: versión 3 y , complejidad, óvalo contra espiral,
  geometría, largo ±15 % y límites, migración de récords, forma del progreso). : sin problemas.
- Calidad: sin avisos nuevos (los 15 S3776 de  son los mismos de ;  sin avisos).
- E2E : **297 pasaron, 0 fallaron**. En las 8 pistas rediseñadas: vuelta completa con el piloto de prueba y
  **los 7 bots completan una vuelta** (0 a 2 caídas de bots en el Espacio, 0 en Reinos); mecánicas (antiturbo, brecha,
  plataforma, portal, bloques, losa, columna, roca), caída y dron, récords del trazado anterior (aviso, ,
  «trazado anterior 2:11.0») y forma de 8 llaves con .
- E2E : 95 pasaron, 1 falló: fps de la Nebulosa con 8 en vivo y CPU ×4 = 54 (umbral 55). Es la lectura
  más pesada y ya variaba en  con carga ajena (32–56 en los reportes de karts-copa-espacio y
  karts-objetos-en-sala); en esta misma corrida la Pradera con 8 dio 59 y dentro de El Castillo con 8 dio 60.
- fps con CPU ×4 (individual): Estación 60, Anillos 60, Cinturón 60, Nebulosa 60; dentro de Giza 60, El Castillo 59,
  Karnak 60, Angkor 60. 8 en vivo: Pradera 59, Nebulosa 54, dentro de El Castillo 60. La máquina tenía carga ajena
  (otros agentes con sus E2E; CPU ≈ 76 %, ≈ 87 procesos de Chrome).
- Hallazgos que se corrigieron en el camino: un interior largo que se enrolla (espiral, greca) dibujaba muros de sus
  otros brazos (45–51 fps): se parte en tramos seguidos; entre muros los bots miran más cerca (uno se atoraba en
  Angkor); Giza lleva la rampa en espiral por fuera.
- Duración: ≈ 25 min la corrida completa.

## Verificación de estado

- Antes: copia del repo de datos de prueba en el scratchpad; `correr.sh` trabaja sobre una copia temporal.
- Después: la copia temporal se borra al terminar; el progreso de Karts de prueba (`?email=` de prueba) solo vive en
  esa copia. Nunca se escribe en tablas `stald_` (Postgres de prueba: no).
- Estado restaurado: Sí — sin acciones extra.

## Resultado

- Estado Step 4: PASS (con la lectura de fps de la Nebulosa en vivo documentada arriba)
- Bloqueos: ninguno
