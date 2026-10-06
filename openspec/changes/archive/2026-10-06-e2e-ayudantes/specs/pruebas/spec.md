## ADDED Requirements

### Requirement: Ayudante común para abrir páginas en E2E
Las pruebas E2E SHALL abrir las páginas del navegador con la sesión de prueba mediante el ayudante
`tests/e2e/lib/navegador.js` (`abrirPagina` y `urlDe`), en lugar de repetir en cada archivo la creación del contexto,
la inyección de `localStorage.stald_sesion_prueba`, el registro de errores JS y diálogos y la URL con `?api=`.
El ayudante SHALL permitir las variantes que usan las pruebas (claves viejas `stald_email` / `ingles_email`,
`window.__TIEMPO_JUEGOS`, scripts extra, viewport, opciones de contexto, manejo de diálogos y espera de un selector)
sin imponer valores que cambien lo que prueban. Migrar una prueba al ayudante SHALL NOT cambiar su número de
pasos `PASS`.

#### Scenario: Abrir Juegos con sesión de prueba
- **WHEN** una prueba llama `abrirPagina(b, { email: 'marisol@example.com', ruta: '/juegos.html', esperar: '[data-juego]', out })`
- **THEN** obtiene una página de 390×844 con `stald_sesion_prueba = { email, token: 'prueba:' + email }`, abierta en
  `/juegos.html?api=<API>`, con el catálogo visible, y cada error JS de la página agrega
  `FAIL error JS (marisol@example.com): <mensaje>` a `out`

#### Scenario: Sesión vieja y relojes acortados
- **WHEN** se pasan `viejo: true`, `ingles: true` y `tiempo: 0.2`
- **THEN** la página arranca además con `stald_email` e `ingles_email` iguales al `email` y con
  `window.__TIEMPO_JUEGOS = 0.2`

#### Scenario: Página sin sesión y sin navegar
- **WHEN** se llama `abrirPagina(b, { out, etiqueta: 'invitada' })` sin `email` ni `ruta`
- **THEN** la página queda en blanco, sin claves de sesión, lista para agregar rutas o escuchas y navegar con
  `p.goto(urlDe(...))` o a un enlace completo

#### Scenario: URL con query y hash
- **WHEN** se pide `urlDe('/ingles.html?modo=profe')` o `urlDe('/ingles.html#alumnos')`
- **THEN** se obtiene `<BASE>/ingles.html?modo=profe&api=<API>` y `<BASE>/ingles.html?api=<API>#alumnos`

#### Scenario: Migración sin cambiar lo que se prueba
- **WHEN** se corre la suite E2E completa antes y después de migrar las pruebas al ayudante
- **THEN** cada prueba migrada termina en verde con el mismo número de pasos `PASS` que en la línea base
