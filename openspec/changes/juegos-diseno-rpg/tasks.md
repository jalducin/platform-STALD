## 0. Rama (OBLIGATORIO)

- [x] 0.1 Rama `feature/juegos-diseno-rpg-ui` desde `origin/main` para el primer PR (CSS común y artefactos)
- [ ] 0.2 Rama `feature/juegos-diseno-rpg` desde `origin/main` después del merge del primer PR

## 1. CSS común (primer PR)

- [x] 1.1 `estilos/ui.css`: tokens `--rpg-*` (claro, oscuro y `data-theme`) y componentes `.rpg-num`, `.rpg-etiqueta`,
  `.rpg-xp-barra`, `.rpg-xp-chip`, `.rpg-dato*` y `.rpg-contador`, con respaldos para los tokens base
- [x] 1.2 `ingles/secundaria.css` sin esas reglas (`?v=2`) e `ingles.html` con `estilos/ui.css?v=1` antes de él
- [x] 1.3 E2E `secundaria-dashboard` en verde (puertos 8931/8932, copia temporal de datos)

## 2. Juegos (segundo PR)

- [ ] 2.1 `juegos.html`: script de `stald_tema` en `<head>`, `estilos/ui.css`, «← Inicio» como botón y `?v=` nuevos
- [ ] 2.2 `juegos/app/juegos.css`:
  - `:root[data-theme="dark"]`;
  - botones reales de 44 px (`.btn`, `.btn.sm`, `.tab`, `.opt`, `.chip-btn`, `.home-link`, música, avatar y color);
  - encabezado `#jg-heroe`, secciones `.jg-seccion`, tarjetas `.jg-tarjeta`, píldora «▶ Jugar» y franja de color en
    `.game`;
  - ranking en tarjetas RPG
- [ ] 2.3 `juegos/app/menu.js`: `#jg-heroe`, «⭐ Para ti», «👥 En vivo · Salas» y «🏆 Copas» en la vista de
  categorías; píldora «▶ Jugar» en `.game`
- [ ] 2.4 `juegos/app/arranque.js`: clic en `[data-jugar]` (abre el juego) y `[data-ir-tab]` (cambia de pestaña)
- [ ] 2.5 Menús de `juegos/*.html`:
  - `.btn.chico` y `.btn` de menú de 44 px o más con foco visible en Karts, Fútbol Estelar, Futbolito Arena,
    Billar, Golf, Futbolito, Brigada, Plataformas y Dragon Run;
  - sin tocar el canvas ni la lógica

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Revisar las E2E de Juegos que dependen del hub (`categorias`, `juegos`, `portal`, `nick`, `partidas`) y
  ajustar solo lo que cambie de forma legítima
- [ ] 3.2 E2E nueva `juegos-diseno` (registrada en `tests/e2e/correr.sh`, fase `base`):
  - encabezado del jugador y secciones;
  - «Para ti» con puntajes y vacío, «▶ Jugar», «En vivo» → Partidas;
  - botones de 44 px o más y sin scroll horizontal a 360 px, en claro, en oscuro y con `stald_tema`;
  - menús de Karts, Fútbol Estelar, Billar y Golf a 360 px;
  - capturas

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 Calidad (`tests/calidad`) y `deno test -A server/` (subagente `verificador-pruebas`)
- [ ] 4.2 E2E de Juegos completas (karts, futbolito, salas, espectador, portal…) y `juegos-diseno`, con una copia
  temporal del repo de datos (`gh repo clone jalducin/platform-STALD-data`) en los puertos 8931/8932. Sin push de
  datos y sin tablas `stald_`
- [ ] 4.3 Reporte `openspec/changes/juegos-diseno-rpg/reports/2026-10-21-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Capturas a 360 px en claro y en oscuro del hub, de «Para ti» vacío y con puntajes, del ranking y del menú
  de Karts, revisadas por el agente
- [ ] 5.2 Producción tras el merge, solo lectura: `juegos.html` con `estilos/ui.css` y los `?v=` nuevos publicados

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: «Diseño RPG compartido (`estilos/ui.css`)», estructura de `juegos/app/` con
  el hub RPG y botones de 44 px; `docs/pruebas.md` (E2E nueva)

## 7. Cierre

- [ ] 7.1 Revisión `revisor-solo-lectura` y hallazgos atendidos
- [ ] 7.2 PR, checks y merge
- [ ] 7.3 `openspec archive juegos-diseno-rpg` (cuando el profe lo vea en el celular)
