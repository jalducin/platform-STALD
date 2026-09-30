## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-plataforma`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/juegos_test.ts`, almacén en memoria):
  - identidad (admin, Inglés, Secundaria, invitado, desconocido);
  - partida: tope, juego inválido, mejor por juego, total semanal y límite diario;
  - ranking: orden, empates, `yo` y semana nueva;
  - invitado: registro, validaciones, alumno `ya` y tope;
  - lista de invitados solo admin;
  - `/perfil` con invitado.
- [x] 1.2 `server/juegos.ts`, rutas en `main.ts` y `perfil.ts` con invitados

## 2. Contenido

- [x] 2.1 `juegos/datos/{ingles,espanol,cultura}.json`, revisados: validación de formato, conteos y muestreo de exactitud

## 3. Frontend

- [x] 3.1 `juegos.html`: sesión, catálogo, marco de juego, resultado, ranking y panel de invitados (admin)
- [x] 3.2 Motores: quiz (reloj y vidas), spelling, memorama, ordena, simon y sopa; los 14 juegos
- [x] 3.3 Portal: tarjeta Juegos activa y entrada de invitados

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`; E2E de juegos:
  - jugar cada juego con guardado;
  - récord y ranking;
  - invitado desde el portal;
  - admin ve invitados.
  - Regresiones: portal e Inglés.
- [x] 4.2 Reporte `openspec/changes/juegos-plataforma/reports/2026-09-30-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Producción tras el merge:
  - curl de ranking, partida con tope, invitado inválido, no registrado e invitados sin ser admin → 403;
  - una partida y un invitado de prueba;
  - **restaurar**: borrar del repo de datos la partida y el invitado de prueba.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (juegos y datos JSON), `docs/backend-standards.md` (rutas `/juegos`), `docs/data-model.md` (`juegos/` y `juegos/datos`), README del repo de datos, `openspec/project.md`
- [ ] 6.2 Commit, push, PR y merge a `main`
