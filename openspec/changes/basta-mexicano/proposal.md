## Por qué
Basta acepta algunas palabras de España (melocotón, ordenador, gafas…), y eso está bien. Pero también las muestra
como ejemplo («p. ej. gafas») y los bots las usan como respuesta. En México suenan raro.

## Qué cambia
- `juegos/datos/basta.json` agrega `es.soloAceptar`, por categoría, con palabras válidas que no se muestran:
  - fruta: albaricoque, melocotón;
  - cosa: bolígrafo, fichero, gafas, grifo, jersey, nevera, ordenador;
  - color: albaricoque.
- Esas palabras salen de `palabras`: los ejemplos y los bots solo usan las de México (durazno, chabacano, pluma,
  lentes, llave, suéter, refri, computadora…).
- La validación sigue aceptando ambas listas: nadie pierde puntos.
