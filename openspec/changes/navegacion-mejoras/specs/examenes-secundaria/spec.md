## ADDED Requirements

### Requirement: Prioridad de la misión principal de Secundaria
La tarjeta «⚔️ Misión principal activa» del Inicio de Secundaria SHALL elegir la clase sin hacer con esta prioridad:
1. lo atrasado y abierto (su día ya pasó), del más viejo al más nuevo;
2. lo de hoy abierto;
3. lo próximo ya abierto (se puede adelantar porque su `disponibleDesde` ya llegó, aunque su `dia` sea futuro);
4. solo si no hay nada abierto, la próxima clase bloqueada («🔒 Abre el …»).

A igual día, el orden de la lista. Una clase con al menos un intento cuenta como hecha. La tarjeta dice el motivo
(«Atrasada», «Vence hoy», «Puedes adelantarla · <día>» o «Próxima: <día>»). La regla es pura
(`SecundariaDatos.misionPrincipal`) y la usan la alumna y la vista del profe (solo lectura). Matriz de acceso: sin
cambios (cada alumna ve solo sus clases; el admin, las de la alumna elegida).

#### Scenario: Atrasada antes que una bloqueada
- **WHEN** la alumna tiene una clase del lunes sin hacer y abierta, hoy es martes y no le queda nada más abierto
- **THEN** la misión principal es la del lunes, con «Empezar», y no la clase bloqueada del miércoles

#### Scenario: Adelantar antes que esperar
- **WHEN** todo lo de hoy está hecho y la clase del jueves ya está abierta (se puede adelantar)
- **THEN** la misión principal es la del jueves con «Puedes adelantarla · Jue …»

#### Scenario: Nada abierto
- **WHEN** no hay ninguna clase abierta sin hacer y la próxima abre el miércoles
- **THEN** la misión principal es la del miércoles con «🔒 Abre el …» y «Próxima: Mié …»

#### Scenario: Todo hecho
- **WHEN** no queda ninguna clase sin hacer
- **THEN** la tarjeta dice «🏁 Misiones al día»

### Requirement: Barra inferior de Secundaria en celular
En celular (menos de 720 px) Secundaria SHALL mostrar una barra inferior fija con las pestañas principales, igual al
patrón de Inglés: la alumna «🏠 Inicio», «⚔️ Misiones», «🗓️ Horario», «📚 Materias» y «☰ Más» (Semana, Mapa y Árbol);
el profe «🏠 Inicio», «📝 Notas», «📥 Entregas», «⚔️ Misiones» y «☰ Más» (lo demás). La barra marca la pestaña actual,
no tapa contenido (hueco al final), mide 44 px o más por botón y desaparece al abrir una clase. En celular la fila de
pestañas de arriba no se muestra; en tablet y PC no cambia. «Atrás» entre pestañas funciona igual que desde la fila.

#### Scenario: Cambiar de pestaña desde la barra
- **WHEN** una alumna a 360 px toca «🗓️ Horario» en la barra inferior
- **THEN** ve «Mi horario», la barra marca «Horario» y «Atrás» la regresa a la pestaña anterior

#### Scenario: Pestaña dentro de «Más»
- **WHEN** toca «☰ Más» y luego «🗺️ Mapa»
- **THEN** ve el Mapa, el menú se cierra y «Más» queda marcado como la sección actual

#### Scenario: Profe en celular
- **WHEN** el profe abre Secundaria a 360 px, elige una alumna y toca «📝 Notas»
- **THEN** ve los resultados por clase en 3 toques desde el portal

### Requirement: Pestañas de Secundaria en una fila en tablet y PC
Desde 720 px las pestañas de Secundaria SHALL caber en una sola fila: las 7 de la alumna y las 9 del profe, también a
1100 px, sin scroll horizontal y con al menos 44 px de alto.

#### Scenario: Profe a 1100 px
- **WHEN** el profe abre Secundaria con una alumna en una ventana de 1100 px
- **THEN** las 9 pestañas están en una fila
