## ADDED Requirements

### Requirement: XP por clase
`comun/gamificacion.js` SHALL calcular el XP de una clase terminada solo con su mejor intento:
round(100 × (aciertos + aciertos del tema 🎯) / preguntas de la clase), es decir, el porcentaje de aciertos en el que
cada acierto de un tema cuyo título empieza con 🎯 (mini examen) cuenta doble (puede pasar de 100), más 20 si el mejor
intento llegó a tiempo. Sin calificación el XP SHALL ser 0. El XP total SHALL ser la suma del XP de las clases
hechas (con al menos un envío).

#### Scenario: Clase a tiempo
- **WHEN** la mejor calificación es 8 de 10 y llegó a tiempo
- **THEN** la clase da 100 XP

#### Scenario: Mini examen
- **WHEN** la clase tiene 12 preguntas normales (9 bien) y 4 del tema 🎯 (4 bien), a tiempo
- **THEN** da 126 XP (106 + 20)

#### Scenario: Entrega tarde
- **WHEN** el mejor intento se envió después de la fecha límite
- **THEN** no suma los 20 del bonus

### Requirement: Nivel y rango
El nivel SHALL ser floor(XP/300)+1. El rango SHALL ser Aprendiz (niveles 1–3), Exploradora/Explorador (4–6),
Sabia/Sabio (7–9) y Gran Sabia/Gran Sabio (10 o más); sin dato de género se muestran las dos formas y con género
`f` o `m`, solo la suya. `nivelDe` SHALL devolver además el XP dentro del nivel y el XP del siguiente nivel.

#### Scenario: Nivel 4
- **WHEN** el XP es 950
- **THEN** el nivel es 4, el rango «Exploradora/Explorador», 50 XP dentro del nivel y 1200 para el siguiente

### Requirement: Mundos por materia
Cada materia SHALL tener mundos por bloque, con las fechas de la skill `clases-secundaria` (las que la skill da como
duración se derivan: Química y Física, 3 meses cada una tras Biología; «Programación e IA» comparten tramo; Ciencias
Sociales rota un mundo por mes tras Geografía): Matemáticas (Valle de los
Números → Ciudad de las Formas → Torre de las Incógnitas), Ciencias (Selva de la Vida → Laboratorio Alquimia → Cumbre
de la Fuerza), Ciencias Sociales (Ágora → Puerta del Tiempo → Atlas del Mundo), Tecnología (Taller Digital →
Laberinto Sintaxis → Núcleo IA), Inglés (Isla del Alfabeto), Español (Gran Biblioteca) y Artes / Educación Física
(Estudio y Arena). Un mundo SHALL estar «completado» si terminó su fecha y todas sus clases (al menos una) están
hechas; «en-curso» si es el actual o terminó con clases pendientes; «bloqueado» si aún no empieza.

#### Scenario: Rotación de Ciencias Sociales
- **WHEN** hoy es 2027-02-10, después de Geografía (enero de 2027)
- **THEN** el mundo de Ciencias Sociales vuelve a ser «Ágora»

#### Scenario: Mundo actual
- **WHEN** hoy es 2026-10-27
- **THEN** el mundo de Matemáticas es «Valle de los Números» y el de Ciencias «Selva de la Vida»

#### Scenario: Mundo completado
- **WHEN** hoy es 2026-11-24 y todas las clases de Matemáticas del 26 de octubre al 22 de noviembre están hechas
- **THEN** «Valle de los Números» está completado, «Ciudad de las Formas» en curso y «Torre de las Incógnitas»
  bloqueado

### Requirement: Insignias derivadas
Las insignias SHALL calcularse de los datos y no guardarse: Primera misión (una clase hecha), Racha de 3, 7 y 14
(racha actual del servidor), 100 % en una clase, Mini examen superado (80 % o más en un tema 🎯) y Mundo completado.
`insigniaNueva(antes, despues)` SHALL devolver las que aparecen entre dos estados o dos listas.

#### Scenario: Insignia nueva al terminar una clase
- **WHEN** antes tenía racha 2 y una clase con 70 %, y después racha 3 y otra clase con 100 %
- **THEN** las nuevas son «Racha de 3» y «100 % en una clase»

### Requirement: Retos diarios y actividad reciente
Los retos diarios SHALL ser las clases cuyo día es hoy, con el XP ganado (hechas) o posible (120), cuántas faltan y
el XP del día. La actividad reciente SHALL listar lo último entregado (por `ultimoEnvio`) con su porcentaje y su XP.

#### Scenario: Retos de hoy
- **WHEN** hoy hay 2 clases y una ya está hecha con 90 % a tiempo
- **THEN** hay 2 retos, falta 1 y el XP del día es 110

### Requirement: A tiempo del mejor intento en el servidor
El listado de actividades de un alumno o alumna (también la vista del admin con `?alumna=`) SHALL incluir por
elemento `mejorATiempo`: `true` si el intento que da la mejor calificación no se envió fuera de tiempo, `false` si sí,
y `null` sin intentos. La respuesta de `POST …/actividades/<id>` guardada SHALL incluir `aTiempo` (el intento recién
enviado) y `mejorATiempo`. La matriz de acceso no cambia.

#### Scenario: Mejor intento tardío
- **WHEN** la alumna envía a tiempo con 50 % y después, tarde, con 100 %
- **THEN** el segundo envío responde `aTiempo: false` y el listado trae `mejorATiempo: false`

#### Scenario: Sin intentos
- **WHEN** la clase no tiene envíos
- **THEN** el listado trae `mejorATiempo: null`

#### Scenario: Sin acceso
- **WHEN** pide el listado un correo sin Secundaria o sin sesión
- **THEN** recibe 403 o 401, como antes
