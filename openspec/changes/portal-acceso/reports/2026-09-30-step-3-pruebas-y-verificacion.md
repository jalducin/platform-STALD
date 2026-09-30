# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: portal-acceso
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/`, `deno check server/main.ts` y `deno lint server/`
- Servidor local con fixture: 3 filas nuevas de Secundaria para una alumna de prueba
  (`valeria@example.com`).
- `curl /perfil`: alumna de Inglés, alumna de Secundaria, admin, desconocido y sin correo.
- E2E: `e2e-portal.js` y regresiones de Inglés (`e2e-semana`, `e2e-correccion`, `e2e-filtro`,
  `e2e-marcar`, `e2e-guion` y `e2e-presentacion`), cada una en un servidor nuevo.

## Resultados de pruebas
- **TDD:** `perfil_test.ts` no compilaba antes de `perfil.ts`. Después, 6/6.
- **Suite:** 55 pasaron y 6 omitidas. `check` y `lint` limpios.
- **Curl local:**
  - Marisol: `ingles: true`, `secundaria: false`, nombre "Marisol".
  - Valeria: solo Secundaria, nombre "Valeria".
  - Admin: "Profe", todo en `true`.
  - Desconocido: `conocido: false`, sin accesos.
  - Sin correo: 400.
- **E2E del portal:** 16/16.
  - Login y aviso de correo inválido; desconocido con mensaje claro.
  - Alumna: saludo y tarjetas Inglés + Juegos (muy pronto). Entra a Inglés sin volver a pedir el correo.
  - "← Inicio" regresa al portal con sesión; "Cerrar sesión" en Inglés limpia el portal.
  - La sesión recordada desde `ingles_email` entra sola.
  - Admin: 3 tarjetas y "Modo maestro".
  - Solo Secundaria: sus tarjetas; `secundaria.html` entra sola, con tareas y "← Inicio".
  - 0 envíos al servidor.
- **Ajustes tras las pruebas y las capturas:**
  - "← Inicio" conserva `?api=`. Sin eso, la prueba local volvía al portal apuntando a producción.
  - La fecha del saludo pone mayúscula solo en la primera letra; con `text-transform` salía "30 De
    Septiembre".
- **Regresiones de Inglés:** semana 16/16, corrección 11/11, filtro 11/11, marcar 9/9, guion 8/8,
  presentación 8/8.

## Producción (4.1)
- **`/perfil`:**
  - Marisol: Inglés.
  - Sofy: Inglés y Secundaria.
  - Admin: todo, como "Profe".
  - Desconocido: sin accesos.
  - Sin correo: 400.
- **E2E de solo lectura en GitHub Pages:** 15/16.
  - La que no pasó espera a alguien que solo tenga Secundaria. En producción se usó a Sofy, que tiene
    Inglés y Secundaria, y le salen correctamente las 3 tarjetas.
  - `secundaria.html` entra sola con sus tareas y "← Inicio".
  - 0 envíos.

## Verificación de estado
- Sin cambios de datos, ni en Notion ni en el repo de datos. Las copias en memoria se borraron y el
  servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
