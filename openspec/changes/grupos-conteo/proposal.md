## Por qué
En «👥 Grupos», el Grupo 1 decía «1 inscritos» aunque tiene 7 alumnos y alumnas. El contador solo cuenta las
inscripciones explícitas. Quien no tiene inscripción cuenta en el primer grupo activo, como ya hacen «Registro»,
el filtro por grupo y las calificaciones.

## Qué cambia
- El contador de cada grupo cuenta a los alumnos y alumnas del registro según su **grupo efectivo** (inscripción o,
  sin ella, el primer grupo activo), con la misma regla `grupoDeNombre` que usa «Registro».
- El texto pasa a «👤 N alumnos y alumnas» («1 alumno o alumna» cuando es una persona).
- Sin cambios en el servidor ni en los datos.
