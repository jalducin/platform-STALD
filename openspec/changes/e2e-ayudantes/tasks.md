## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/e2e-ayudantes` desde `origin/main`

## 1. Línea base

- [x] 1.1 Antes de tocar las pruebas, correr la suite E2E completa (`correr.sh` sin nombres, sin `--pg`) y guardar
  los conteos de `PASS` por prueba

## 2. Ayudante

- [ ] 2.1 `tests/e2e/lib/navegador.js` con `abrirPagina(b, opciones)` y `urlDe(ruta)` (opciones en `design.md`)

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Migrar al ayudante las pruebas con ayudante local repetido: `ajedrez`, `ajustes-salas`, `alta-alumnos`,
  `avatar-foto`, `basta-rondas`, `cartas-espanolas`, `examen-secundaria`, `juegos`, `jugadores`, `juegos-recarga`,
  `login` (y `login-despues`, que la reutiliza), `loteria-sala`, `nick`, `partidas`, `poker`, `pronunciacion`,
  `puntos-tipo`, `ruta-profe`, `segunda-oportunidad` y `una-sala`
- [ ] 3.2 Migrar las aperturas en línea: `autoguardado`, `clasicos`, `conquian-estres`, `dragon-run`, `enlace-sala`,
  `fusion`, `inicio-lunes`, `profe-diseno`, `profe-grupo`, `ritmo`, `sudoku` y `una-robo`
- [ ] 3.3 Sin cambios en aserciones, correos, rutas ni selectores; `node --check` de todas las pruebas y revisión de
  constantes sin declarar
- [ ] 3.4 Dejar fuera, documentado como pendiente, `grupos` e `ingles-pro` (solo corren con `--pg`)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 Suite E2E completa con los mismos puertos que la línea base; mismos conteos de `PASS` por prueba y todo en
  verde. Las intermitencias se repiten solas y se reportan
- [ ] 4.2 `npx -y deno test -A server/` y `npx -y deno lint server/` sin cambios respecto a `main`
- [ ] 4.3 Estado: la copia de datos del scratchpad no se modifica (`correr.sh` trabaja sobre una copia temporal); sin
  Supabase ni producción
- [ ] 4.4 Reporte en `openspec/changes/e2e-ayudantes/reports/2026-10-06-step-4-pruebas-y-verificacion.md` con la tabla
  de `PASS` antes/después por prueba

## 5. Verificación manual (CLI) — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 `urlDe` con ruta simple, con query y con `#hash`; `abrirPagina` sin `email` no deja claves de sesión y con
  `viejo`/`ingles`/`tiempo` sí (Chromium real, sin servidor)
- [ ] 5.2 `correr.sh` con una prueba migrada suelta (caso válido) y con un nombre inexistente (caso inválido: sale con
  2 y lista las disponibles)

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/pruebas.md`: «Sesión de prueba» y «Agregar una prueba» usan el ayudante, sin duplicar sus opciones
  (la fuente es el encabezado de `lib/navegador.js`)
