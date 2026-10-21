## ADDED Requirements

### Requirement: Validar una semana de Secundaria
El validador SHALL aceptar la bandera `--secundaria` (`server/validar_semana.ts <dir-datos> <lunes> --secundaria`)
para revisar `contenido/secundaria/semanas/<lunes>.json` y sus elementos en `contenido/secundaria/`. En ese modo SHALL
no exigir un patrón de tipos por día, SHALL exigir `disponibleDesde` dentro de `<lunes>…fechaLimite` y SHALL permitir
que un examen abra antes de su día. En todos los ámbitos, `materia` SHALL ser opcional; si viene y no es un texto de 1
a 40 caracteres, SHALL ser error. Con `--secundaria`, una `materia` fuera de las 8 conocidas SHALL ser aviso.

#### Scenario: Semana de Secundaria válida
- **WHEN** se valida con `--secundaria` una semana con 2 clases por día de lunes a sábado y 3 el domingo, con `materia`
- **THEN** no hay errores ni avisos de patrón y el código de salida es 0

#### Scenario: Examen mensual con ventana
- **WHEN** con `--secundaria` un examen tiene `disponibleDesde` el lunes y `fechaLimite` el domingo
- **THEN** no hay error «el examen debe quedar bloqueado hasta su día»

#### Scenario: Materia inválida
- **WHEN** una clase trae `materia` vacía, que no es texto o de más de 40 caracteres
- **THEN** hay un error de `materia` y el código de salida es 1

#### Scenario: Materia desconocida
- **WHEN** con `--secundaria` una clase trae `"materia": "Robótica"`
- **THEN** hay un aviso, no un error

#### Scenario: Sin la bandera
- **WHEN** se valida la misma semana sin `--secundaria`
- **THEN** se busca en `contenido/semanas/` como siempre
