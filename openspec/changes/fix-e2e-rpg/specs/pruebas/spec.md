## ADDED Requirements

### Requirement: Ruta del profe de ejemplo en las E2E
Las E2E de la ruta del profe (`ruta-profe`, `profe-diseno`) SHALL NOT depender de la ruta real del repo de datos ni del
orden de las pruebas. `correr.sh` SHALL hacer esto, en este orden:
1. borrar de la copia `contenido/profe` y los `profe.json` de resultados;
2. superponer `tests/fixtures/datos/`.

Ese contenido incluye una ruta de ejemplo (`contenido/profe/`) y un resultado de ejemplo del profe.

La ruta de ejemplo SHALL ser coherente con el día fijo por omisión (2026-10-04) y SHALL cubrir:
- una semana actual;
- la semana siguiente (el domingo);
- una semana futura con un elemento ya abierto y otro que aún no abre;
- un elemento completo.

#### Scenario: La ruta real cambia de fechas
- **WHEN** el profe sube una ruta nueva que empieza después del día fijo
- **THEN** `ruta-profe` y `profe-diseno` siguen en verde con la ruta de ejemplo, en la rama «con ruta propia»

#### Scenario: Se corre profe-diseno sola
- **WHEN** se corre `correr.sh … profe-diseno` sin `profe-grupo` antes
- **THEN** la pestaña «✅ Hechas» trae al menos el resultado de ejemplo y la prueba pasa

#### Scenario: Elemento completo
- **WHEN** `ruta-profe` revisa que se abren los elementos ya disponibles del plan
- **THEN** espera 200 de los que aún tienen intentos; lo completo responde 409 `sin_intentos` y no cuenta como falla

### Requirement: Presupuestos de peticiones en E2E
`e2e-peticiones` SHALL medir cada flujo representativo contra un presupuesto fijo y SHALL verificar que ningún flujo
con sesión pide `GET /interruptores` aparte (los interruptores llegan en `/config`). Un presupuesto SHALL subir solo
con su justificación en este spec.

Presupuesto de `sala de 2 personas (30 s, ambas)`: 42. Son 14 peticiones fijas (`/config`, `/juegos/yo`, crear,
unirse, empezar y sus `OPTIONS`) más el sondeo de cada página cada 2.5 s durante los ~33 s del flujo (hasta 14 por
página). Mide 41 desde 2026-10-12 por tiempos, no por una petición nueva; el 40 anterior no dejaba margen para un
sondeo más.

#### Scenario: Página con sesión
- **WHEN** se mide el portal, Inglés, Juegos o la sala
- **THEN** el flujo queda en su presupuesto y sin `GET /interruptores`

#### Scenario: Sala de 2 personas
- **WHEN** dos personas juegan ¡Una! 30 s sin Realtime
- **THEN** el flujo hace 42 peticiones al API o menos
