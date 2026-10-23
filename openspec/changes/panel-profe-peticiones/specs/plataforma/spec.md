## ADDED Requirements

### Requirement: Presupuesto de peticiones del panel del profe
La E2E `peticiones` SHALL fallar si abrir `ingles.html` como admin (hasta que la página queda quieta) hace más
peticiones al API, `OPTIONS` incluidas, que el tope fijado con la medición de `panel-profe-peticiones` (antes 17).
El tope SHALL ser el número real medido, para que no vuelva a subir sin que alguien lo decida.

#### Scenario: Panel del profe
- **WHEN** la E2E abre `ingles.html` con la sesión del admin y espera a que no haya peticiones
- **THEN** el total de peticiones al API es menor o igual que el tope y ninguna es a `/ingles/grupos`,
  `/ingles/alumnos`, `/ingles/resumen`, `/profe/entregas` ni `/juegos/admin/resumen`
