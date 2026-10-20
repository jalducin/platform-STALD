## ADDED Requirements

### Requirement: Diagramas en la teoría
Un bloque de `teoria` SHALL admitir un `diagrama` opcional con `tipo` `flujo`, `ciclo`, `capas`, `ramas` o `comparar`, `pasos`
(2–8, cada uno `{ texto, detalle?, icono? }`), `titulo?`, `nota?`, `centro` (ramas) y `columnas?`/`derecha`
(comparar). La vista de teoría (alumnos y alumnas, profe, secundaria y material del Meet) y la diapositiva `teoria`
del Meet SHALL pintarlo con HTML y CSS, escapando todo texto, legible en modo claro y oscuro y sin scroll horizontal
a 360 px de ancho. Un bloque sin `diagrama` SHALL verse igual que antes.

#### Scenario: Flujo
- **WHEN** un bloque trae `diagrama.tipo = "flujo"` con 4 pasos
- **THEN** se ven 4 cajas en orden unidas por flechas (en fila en pantalla ancha, en columna en celular)

#### Scenario: Ciclo
- **WHEN** el tipo es `ciclo`
- **THEN** se ve el flujo y una flecha que regresa del último paso al primero

#### Scenario: Capas
- **WHEN** el tipo es `capas`
- **THEN** los pasos se apilan como bloques, el primero arriba

#### Scenario: Ramas
- **WHEN** el tipo es `ramas` con `centro`
- **THEN** se ve el nodo central y los pasos como ramas que salen de él

#### Scenario: Comparar
- **WHEN** el tipo es `comparar` con `columnas` y `derecha`
- **THEN** se ven dos columnas con sus encabezados, `pasos` a la izquierda y `derecha` a la derecha

#### Scenario: Texto con HTML
- **WHEN** un paso contiene `<b>` o `<script>`
- **THEN** se muestra como texto literal, sin interpretarse

#### Scenario: Celular
- **WHEN** la actividad se abre a 360 px de ancho con los 5 tipos
- **THEN** todos se pintan y la página no tiene scroll horizontal
