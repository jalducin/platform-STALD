# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: juegos-partidas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/` (sin y con `DATA_DIR`), `deno check` y `deno lint`
- Servidor local con fixture y almacén en memoria.
- E2E:
  - `e2e-partidas.js`: dos navegadores (anfitriona y otro jugador) con bots y relojes acelerados;
  - `e2e-enlace-juegos.js`;
  - regresiones: `e2e-juegos`, `e2e-clasicos`, `e2e-portal` y `e2e-semana`.

## Resultados de pruebas
- **TDD:**
  - `salas_test.ts` no compilaba sin `salas.ts`. Después, 7/7: crear, juego no permitido, no registrado,
    unirse, 404, 409 tras empezar y con cupo lleno, solo el host empieza, respuestas, Basta, 410 al vencer
    y sin correos.
  - Prueba nueva de caché de identidad en `juegos_test.ts`: Notion se consulta 1 vez en 5 sondeos, y la
    lista de invitados siempre fresca.
- **Suites:** sin `DATA_DIR`, 76 pasaron y 6 omitidas; con `DATA_DIR`, 82 pasaron. `check` y `lint`
  limpios.
- **E2E de partidas:** 15/15.
  - La opción de maratón aparece para cultura y se genera un código de 4 letras.
  - Sala de espera: 2 personas + 2 bots en ambos navegadores; solo la anfitriona puede empezar.
  - **Misma pregunta y mismas opciones en ambos.** Los dos respondieron las 10 preguntas.
  - **Podio idéntico en ambos**, con los bots, y puntos guardados en el ranking.
  - **Basta:**
    - misma letra;
    - "¡Basta!" solo con todo lleno;
    - el otro jugador ve el aviso y se le cierra la ronda;
    - la palabra repetida vale 50 para ambos;
    - podio idéntico.
- **Ajustes tras revisar las capturas y las pruebas:**
  - En el podio final ya no se muestra el "+puntos" de la última pregunta.
  - Se reinicia el estado local al entrar a otra partida.
  - Se limpiaron las llaves sobrantes de `genCalculo`.
- **Refactor:**
  - `barajar`, `tomar` y `conOpciones` aceptan un aleatorio; por defecto usan `Math.random`.
  - `genCalculo` y `genSecuencia` se comparten entre el modo solo y las partidas.
  - Regresiones: juegos 29/29, clásicos 11/11, portal 16/16 y semana 16/16.
- **Enlace 🎮 Juegos:** 2/2. Desde `ingles.html` y `secundaria.html` abre los juegos con sesión y conserva
  `?api=`.

## Verificación de estado
- Sin cambios en datos reales. En el repo de datos solo cambió el README.
- Las copias en memoria se borraron y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
