## ADDED Requirements

### Requirement: Navegación ágil en celular, tablet y PC
La plataforma (portal, Inglés, Secundaria, la ruta del profe y Juegos) SHALL permitir las tareas clave de cada persona
en celular (360 px, táctil), tablet (768 y 1024 px, táctil) y PC (1280 y 1920 px):
- sin scroll horizontal ni errores de consola;
- con objetivos táctiles de al menos 44 × 44 px en pantallas táctiles (los enlaces dentro de un párrafo se eximen);
- sin que la barra inferior ni la barra fija del examen tapen el elemento al que se llega;
- con una forma visible de volver (enlace a Inicio, barra inferior o «← Volver») y con el atrás del navegador que
  regresa a la pantalla o pestaña anterior sin salir de la plataforma;
- en PC, con un contenedor que use el ancho (al menos 960 px o el 70 % de la ventana), sin una columna de celular
  estirada;
- con el teclado: Tab recorre con foco visible, Enter abre y las flechas cambian de pestaña en Secundaria sin agregar
  entradas al historial.

Los toques de navegación por tarea SHALL quedar en su tope (E2E `navegacion-dispositivos`): clase de Secundaria hasta
«Siguiente misión» 4; pestañas de Secundaria 3; actividad de Inglés 4 (3 si está en «Para hoy»); Material → PDF 2; invitado de Juegos (entrar,
jugar y volver) 6; panel del profe (ver grupo, ocultar/mostrar y Entregas) 7; Secundaria del profe con alumna y
Resultados 3; Mi ruta → clase 3.

Matriz de acceso: sin cambios; solo navegación y estilos del cliente.

#### Scenario: Atrás entre pestañas de Secundaria
- **WHEN** una alumna toca «Mi horario», luego «Mis materias» y luego «Misiones», y toca «Atrás» en su celular
- **THEN** regresa a «Mis materias», luego a «Mi horario» y luego a «Inicio», sin salir de Secundaria

#### Scenario: Atrás tras elegir otra alumna (profe)
- **WHEN** el profe elige otra alumna en el selector de Secundaria y luego toca «Atrás»
- **THEN** la URL y el tablero coinciden (cada alumna es una entrada del historial con su `?alumna=`)

#### Scenario: Entregas sin quedarse cargando
- **WHEN** el profe abre «📥 Entregas» después de que el panel ya pidió la bandeja
- **THEN** ve las entregas o el aviso de que no hay, no el esqueleto de carga

#### Scenario: Objetivos táctiles en celular
- **WHEN** un alumno de Inglés abre su Inicio, el Material o una actividad a 360 px
- **THEN** «← Inicio», «🎮 Juegos» y cada botón miden al menos 44 px de alto y de ancho

#### Scenario: PC ancha
- **WHEN** una alumna abre Inglés o Secundaria, o alguien abre el hub de Juegos, en una pantalla de 1280 px o más
- **THEN** el contenido ocupa al menos 960 px (Inglés con el menú a un lado; Secundaria con las 7 pestañas de la alumna en una fila;
  Juegos con más columnas) y dentro de un juego la columna no cambia

#### Scenario: Portal → Secundaria sin puente
- **WHEN** una alumna o el profe tocan «📚 Mis clases» o «🗓️ Mi horario» en el portal
- **THEN** abren `ingles.html?modo=secundaria` (con su `?alumna=` y `#horario` si aplica) sin cargar `secundaria.html`

#### Scenario: Siguiente misión sin tapar
- **WHEN** una alumna termina una clase en una tablet y el navegador la lleva a «Siguiente misión»
- **THEN** el botón queda por encima de la barra fija del examen
