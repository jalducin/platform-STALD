# Diseño — rpg-privacidad

> Deriva de `plataforma-rpg` (tareas 3.13 y 3.14; `design.md` §3.4, §4.3 y §6 decisión 7). Ejemplos con personas
> inventadas.

## 1. Interruptor público

**Decisión:** un documento `config/interruptores.json` leído por el servidor y expuesto en `GET /interruptores`.

- **Dónde vive:** fila de `stald_docs` (la misma tabla de los interruptores que prevé `plataforma-rpg` para ranking y
  tutor). El servidor la lee directo con `db.select("docs", …)`, sin pasar por `PgStore`, porque `config/` no es una
  ruta migrada de Inglés ni de Juegos. Sin Postgres (pruebas y servidor local) se lee del almacén de datos
  (`DATA_DIR` o el repo privado).
- **Falla cerrada:** sin documento, con error de Postgres o con valores que no son `true` estricto → apagado. Un error
  nunca muestra un borrador.
- **Solo llaves conocidas:** la respuesta se arma con la lista `INTERRUPTORES_POR_OMISION`; lo demás del documento no
  sale. Agregar un interruptor = agregar la llave ahí y documentarla.
- **Costo:** caché en memoria de 60 s (como las marcas de migración) y `Cache-Control: public, max-age=60`. Encender
  o apagar se nota en ≤ 2 minutos. Una sola petición pequeña por página.
- **Alternativas descartadas:** variable de entorno (exige redeploy); archivo en el repo público (exige PR y deploy de
  Pages); campo dentro de `/config` (su caché es de 10 min y mezcla configuración de sesión con contenido).

**Cliente:** `comun/interruptores.js` lee la ruta una vez y aplica atributos `data-interruptor` (visible encendido)
y `data-interruptor-apagado` (visible apagado). Si la página trae `?api=`, lo agrega a los enlaces para que la página
destino lea el mismo servidor (pruebas locales).

**Modelo de amenaza mínimo:** la ruta es pública y de solo lectura; no revela datos de personas. Alguien podría ver el
texto del borrador leyendo el HTML de Pages aunque esté apagado; se acepta porque el texto es público por naturaleza,
no tiene datos personales y lleva la nota de borrador. Encender requiere la llave de servicio de Supabase (solo el
profe o el agente).

## 2. Contenido del aviso

Integral pero en lenguaje claro para personas de 12 a 15 años y sus familias:

- «En un minuto» (7 puntos) y un índice; 12 secciones con `id` estables: responsable, datos, finalidades, dónde se
  guardan, quién los ve (matriz de `plataforma-rpg` en tarjetas), no vendemos ni compartimos, tutor IA (fase futura),
  conservación (plazos de `plataforma-rpg` §4.3), menores y consentimiento, derechos ARCO, almacenamiento en el
  aparato y cambios.
- **Describe la plataforma como es hoy**, no como será: en Juegos el ranking y las partidas muestran apodo y avatar
  (o nombre de pila si no hay apodo) a quien juega, incluidos invitados; la foto se sirve por un enlace difícil de
  adivinar; el borrado es a mano; el historial del repo privado guarda copias. Lo que llega con fases futuras
  (ranking de Inglés oculto, tutor, borrados automáticos) se marca como futuro.
- Finalidades necesarias y secundaria (mejorar la plataforma) por separado, como pide la LFPDPPP.
- ARCO: «escríbele a tu profe por el canal de la escuela», sin publicar correos; el medio concreto queda `[pendiente]`.
  Sustituye «por correo al profe» de `plataforma-rpg` §4.3.
- Lo que el diseño no fija queda como `[pendiente]` visible para el profe: nombre y domicilio del responsable, región
  de los servicios, plazos de borrado (cuenta y Juegos), cómo se borra del historial del repo, medio de contacto,
  proveedor de IA, plazos legales de respuesta y autoridad vigente.
- Nota visible «Borrador para revisión del profe… no es asesoría legal».

## 3. Formato de consentimiento

Una hoja carta: 5 autorizaciones con «Sí / No» (plataforma; foto en el avatar de Juegos, opcional, porque hoy la
casilla de permiso la marca el propio menor y nadie la verifica; ranking de Inglés por apodo; tutor IA y entregas
con imagen o audio, opcionales y marcadas «fase futura»), campos en blanco (alumno o alumna, quien firma,
parentesco, fecha y firma) y la leyenda de que la plataforma no guarda el documento (solo slug, tipo y fecha). El parentesco se agrega porque la ley
pide el consentimiento de quien ejerce la patria potestad o la tutela; no se piden más datos.

## 4. Estilo

`estilos/legal.css` compartido (las dos páginas usan los mismos tokens del portal) en vez de CSS duplicado en cada
archivo. Claro y oscuro por sistema o `stald_tema`; 360 px sin scroll horizontal; `@media print` carta con márgenes
de 1.4 × 1.6 cm, sin navegación ni botones.
