## Context

Las vueltas viven por pista en `juegos/karts-pistas.js` (`vueltas`) y todo lo demás se deriva en `juegos/arcade.js`:
`refKarts = largo × vueltas / (VEL_KART × 0.8)`, `limitesKarts = { minMs: 25 % ref, limiteMs: ⌈2.5 × ref⌉ (10 s) }`,
`LIMITE_SALA.karts`/`MIN_SALA.karts` = el mayor/menor de las pistas, `tiempoBot = ref × factor / ritmoBots`. El
servidor (`server/carreras.ts`) importa ambos archivos; `server/progreso.ts` toma `RECORD_*` y `VERSION_PISTAS` de
`KartsPistas`. El HUD (`#h-vuelta`), el aviso «¡Última vuelta!» y la campana de Emoción usan `vueltasPista()`.

## Decisions

1. **Solo cambia el dato `vueltas` (2 → 3)** y el valor por omisión `Arcade.VUELTAS`. No se tocan fórmulas: la
   referencia, los límites, el cierre de la sala (`límite + GRACIA_SALA`), el calendario de la copa en sala
   (`karts-copa.js` usa `limiteSala`) y los bots se recalculan solos. Así no hay números copiados que se desincronicen.
2. **`RECORD_MAX_MS` = 20 min (1 200 000)**. Regla de coherencia probada: `RECORD_MAX_MS ≥ 2 × LIMITE_SALA.karts` y
   `≥ 5 × la mayor referencia`. Con 3 vueltas el mayor límite es ≈ 8:50, así que una carrera individual muy lenta (p. ej.
   12 min atorado contra un muro) sigue siendo récord válido. Se mantiene `anotarRecord`: lo que pasa de 20 min no se
   anota y la copa en curso se guarda igual (defecto del profe, karts-puntos-copas). Subir el tope solo afloja la
   validación: los avances guardados antes siguen siendo válidos.
3. **Récords: `VERSION_PISTAS` 4 y `recordsV3` («2 vueltas»)**, igual que el sprint 30 (`recordsV1`, «pista chica») y
   el 38 (`recordsV2`, «trazado anterior»). `migrarRecords`:
   - sin `pistasV` → todo a `recordsV1` (`'chica'`), como antes;
   - `pistasV` 2 → las pistas con `trazado: 3` a `recordsV2` y las demás a `recordsV3` (todas eran de 2 vueltas);
   - `pistasV` 3 → todos los `records` a `recordsV3` (`'vueltas'`);
   - devuelve `'chica'`, `'trazado'`, `'vueltas'` o `false`; el aviso de `'vueltas'` es «🏁 ¡Ahora son 3 vueltas!» +
     «Tus récords de antes: «2 vueltas»». Con `pistasV` 2 gana el aviso de las curvas nuevas solo si no hubo récords
     de 2 vueltas que archivar en otras pistas; si hubo, se avisa de las 3 vueltas (el cambio más visible).
   - Copas ganadas, piezas, equipo, la copa en curso y los archivos `recordsV1`/`recordsV2` no cambian. Las monedas
     son del ranking (servidor), no del avance: no se tocan.
4. **Copa en curso: sus carreras restantes ya son de 3 vueltas.** Los puntos de la copa son por lugar, no por tiempo,
   así que mezclar carreras de 2 y 3 vueltas no hace injusta la tabla (los 8 corredores corren las mismas vueltas en
   cada carrera). Las vueltas son propiedad de la pista y se leen al empezar cada carrera; mantener 2 vueltas exigiría
   guardar las vueltas en `copaEnCurso` (otra forma en el servidor) solo para una transición. Se conserva la copa
   (puntos y número de carrera) intacta.
5. **Servidor**: formas aceptadas de `karts` (pestañas viejas incluidas):
   - base (5 llaves);
   - `+ pistasV 2, recordsV1`;
   - `+ pistasV 3, recordsV1, recordsV2`;
   - `+ pistasV 4, recordsV1, recordsV2, recordsV3` (nueva).
   Cualquier otra combinación (p. ej. `recordsV3` con `pistasV` 3) es `400 progreso_invalido`.
6. **Salas en vivo**: el reloj de la sala vence en `limiteSala + GRACIA_SALA` de la pista, que ya sale de las vueltas.
   El cierre «30 s después del primero» (43a) es independiente de las vueltas: con 3 vueltas solo cambia cuándo llega
   el primero. Marca `// karts-3-vueltas` en lo que se toque.

## Risks / Trade-offs

- Pestaña vieja (antes del merge) con un avance `pistasV` 3: el servidor lo sigue aceptando; al abrir la página nueva
  se migra a 4. Una pestaña vieja que guarde después de la migración mandaría `pistasV` 3 sin `recordsV3`: se acepta y
  la siguiente apertura vuelve a migrar (los récords de 3 vueltas que tuviera pasarían a «2 vueltas»; caso raro y sin
  pérdida: siguen visibles).
- El turbo de salida (`TURBO_SALIDA`) y el rendimiento no cambian.
