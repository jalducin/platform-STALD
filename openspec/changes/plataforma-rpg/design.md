# Diseño — plataforma-rpg

> Propuesta para aprobación del profe. Documenta el **cómo** de las fases 2 a 4 y fija las reglas de la Fase 1 (en
> curso) como invariante. Todos los ejemplos usan personas inventadas.

## Contexto y restricciones

- **Stack fijo:** páginas estáticas en GitHub Pages (HTML, CSS y JS vanilla, sin build), servidor Deno Deploy
  (`server/main.ts`), Supabase (Postgres `stald_*` con RLS sin políticas públicas, Auth, Realtime) y el repo privado
  de datos `platform-STALD-data` con el contenido en JSON. La única pieza nueva es el **proveedor de IA** de la Fase 3
  (§4.4).
- **Usuarios:** alumnos y alumnas de 12 a 15 años. Hoy: una alumna en Secundaria y un grupo de Inglés. Diseñar para
  decenas, no para miles: nada de colas, workers ni bases nuevas.
- **Fase 1 en curso** (otros dos agentes): dashboard RPG en Secundaria con `comun/gamificacion.js` y la clase como
  «misión» por pasos con +XP. Sus reglas son la base de este diseño y **no se cambian** aquí:

  | Regla de Fase 1 | Valor |
  |---|---|
  | XP de una clase | mejor porcentaje (0–100) + 20 si se entregó a tiempo |
  | Mini examen 🎯 | cuenta ×2 |
  | Nivel | floor(XP / 300) + 1 |
  | Rangos, racha e insignias | derivados de los resultados |
  | Mundos | uno por bloque de materia |

  Cualquier mejora a esas reglas queda como propuesta (§1.8), no como cambio.

---

## 1. Arquitectura de la experiencia y gamificación

### 1.1 El año escolar como mapa: Mundos → Zonas → Capítulos

| Nivel RPG | Qué es en la escuela | Ejemplo (Matemáticas) | Cómo se calcula |
|---|---|---|---|
| **Mundo** | Bloque temático de una materia (lo que la skill llama «secuencia») | «Valle de los Números» = Aritmética, 26 oct–22 nov 2026 | Catálogo `mundos.json` (Fase 2); en Fase 1, derivado de materia + fechas |
| **Zona** | Bloque de 2 semanas de clases | Zona 1: 26 oct–8 nov | Por fecha (`disponibleDesde`) dentro del mundo |
| **Capítulo** | Una clase (`actividad`) | «🔢 Matemáticas · Fracciones equivalentes» | Cada elemento de `contenido/secundaria/` |
| **Jefe de zona** | Mini examen 🎯 de la última clase de la materia en el bloque | 🎯 Repaso de aritmética | Tema 🎯 de la skill (XP ×2, regla de Fase 1) |
| **Misión principal** | Proyecto práctico que cierra el mundo | «La tiendita del salón» (§2) | `misiones/<id>.json` (Fase 2) |
| **Misiones secundarias** | Artes y Educación Física (domingos alternados), repasos y tareas sueltas | 🎨 Artistas mexicanos | Elementos sin mundo propio |

**Mapa de mundos de Secundaria (tramo oct 2026 – mar 2027; nombres propuestos, el profe puede cambiarlos):**

| Materia | Mundo 1 | Mundo 2 | Mundo 3 |
|---|---|---|---|
| Matemáticas | 🔢 Valle de los Números — Aritmética (26 oct–22 nov) | 📐 Tierra de las Formas — Geometría (23 nov–20 dic) | ❓ Reino de la Incógnita — Álgebra (ene 2027 →) |
| Ciencias | 🌱 Bosque de la Vida — Biología (oct 2026–ene 2027) | ⚗️ Laboratorio Alquimista — Química (3 meses) | ⚡ Torre de la Energía — Física (3 meses) |
| Ciencias Sociales | 🤝 Plaza Cívica — Cívica y Ética (26 oct–22 nov) | 📜 Archivo del Tiempo — Historia (23 nov–20 dic) | 🗺️ Atlas de México — Geografía (ene) |
| Tecnología | 🖥️ Taller Digital — Bases (≈ 6 semanas) | 🐍 Ciudad del Código — Python e IA | — |
| Inglés | 🔤 Isla de las Letras — alfabeto, números, colores | 🧍 Puerto *To Be* — *to be*, posesivos, adjetivos | 🛒 Mercado del Presente — presente simple, *there is/are* |
| Español | 📚 Biblioteca de los Textos — programa de 1.º por tema, con ortografía en cada zona | — | — |

Ciencias Sociales rota cada mes: al volver a Cívica se abre «Plaza Cívica II» (mundo nuevo), así cada mundo tiene
inicio y fin claros. En Inglés de grupo, los mundos siguen las unidades de la ruta del profe.

**Estados de un mundo:** 🔒 bloqueado (aún no empieza), 🟡 en curso, ✅ completado (cerró su fecha y la misión
principal está evaluada), ⭐ dominado (completado con ≥ 80 % de promedio y misión principal ≥ 80 %). Un mundo cuya
fecha ya pasó **no se bloquea**: se puede volver a repasar.

### 1.2 XP, niveles, rangos, racha e insignias

- XP de clases y mini exámenes: regla de Fase 1 (tabla arriba), sin cambios.
- **XP de misión principal (nuevo, Fase 2):** porcentaje de la rúbrica (0–100) × 3 + 60 si se entregó a tiempo. Una
  misión principal vale como tres clases: es el trabajo de varios días.
- Nivel = floor(XP / 300) + 1 (Fase 1). La XP de misiones entra al mismo total.
- Rangos e insignias: los de Fase 1. Fase 2 agrega insignias de misión (p. ej. «🏗️ Constructora de mundos» al cerrar
  el primer mundo con su misión) e **insignias manuales** que el profe da con un motivo (p. ej. «💡 Gran pregunta»).
- La XP **no se resta como castigo** ni es negativa (solo cambia si el profe corrige una calificación). Una clase vencida sin intento da 0 XP y aparece en «por
  recuperar».

### 1.3 Misiones diarias y semanales

Se **derivan** de las clases (no se capturan a mano):

| Tipo | Regla | Recompensa |
|---|---|---|
| Diaria | «Completa tus clases de hoy» (las de `disponibleDesde` = hoy, hora de la Ciudad de México) | Progreso visible (2/2) y cuenta para la racha |
| Diaria (opcional) | «Revisa la teoría de mañana» o «Pregúntale al tutor algo de hoy» (Fase 3) | Marca ✔, sin XP |
| Semanal | «Termina las 15 clases de la semana», «Avanza un paso de tu misión principal», «Mejora un tema en debilidad» | Insignia semanal («🗓️ Semana completa») |

Para no tocar la fórmula de XP de la Fase 1, las misiones diarias y semanales **no dan XP extra** en Fase 2; dan
insignias y progreso. El bono de XP queda como decisión del profe (§6).

### 1.4 Árbol de habilidades por materia

- Cada materia tiene un árbol cuyos **nodos son los temas** (`temas[]` de las clases), agrupados por mundo.
- Estado de un nodo según la retroalimentación por tema del último intento (`fortaleza`, `en-progreso`,
  `debilidad`): 🔒 aún no visto, 🌱 en progreso, 🔧 a reforzar, 🌳 dominado (fortaleza en el último intento o
  ≥ 80 % en el tema).
- Un nodo «a reforzar» ofrece un botón «Reforzar» que abre el repaso de ese tema si existe (repasos de la skill) y,
  en Fase 3, «Pregúntale al tutor».
- Se deriva por completo de los resultados: no se guarda nada nuevo.

### 1.5 Mecánicas de interacción y retroalimentación inmediata

- Al enviar una clase: el servidor ya califica y devuelve la retroalimentación por tema; el cliente muestra al
  instante «+N XP», la barra de nivel avanzando, «¡Subiste a nivel N!» si aplica y la insignia ganada.
- **Práctica con revisión inmediata** solo en los pasos de teoría de la clase-misión (preguntas de comprensión que no
  cuentan), comprobada en el servidor con `POST /practica/comprobar` (devuelve correcto o no y una pista). Así
  ninguna respuesta correcta llega al navegador, como pide el requisito vivo de `examenes-ingles`. Los ejercicios
  calificables se siguen revisando al enviar.
- Accesibilidad: respeta `prefers-reduced-motion` (sin animaciones grandes), sonido **apagado por defecto** (reusar
  el módulo de sonidos de Juegos), botones ≥ 44 px, claro y oscuro, 360 px sin scroll horizontal.
- Tono: siempre en positivo («Te faltan 2 clases para completar la semana»), nunca «vas atrasado» ni «en riesgo».

### 1.6 Nick y ranking por grupo (solo Inglés, Fase 2)

- **Nick:** 3 a 16 caracteres, letras, números y espacios; sin correos, teléfonos ni el nombre real de la persona;
  filtro de palabras ofensivas y de **cualquier nombre de pila del registro** (evita suplantar o burlarse de otro); el
  profe lo aprueba antes de que se vea. Es **independiente del nick de Juegos**, que tiene otras reglas (2–20
  caracteres, sin aprobación; spec `juegos`); reusarlo es decisión del profe (§6) y solo si cumple estas reglas.
- **Ranking:** por grupo de Inglés y por semana (lunes a domingo, hora de la Ciudad de México), ordenado por **puntos
  de constancia**, no por XP: 10 por actividad enviada a tiempo, 5 tarde y 20 por paso de misión entregado. Así el
  ranking premia el esfuerzo y **no permite deducir calificaciones** (la XP y el nivel incluyen porcentajes). Muestra
  posición, nick y puntos de constancia. Nada de foto, nombre, correo, XP, nivel ni calificaciones. La caché se
  invalida al cambiar un nick, su aprobación o la preferencia de ocultarse.
- **Ocultarse:** cada quien puede ocultarse en cualquier momento («🙈 No aparecer en el ranking»); sigue viendo su
  propia posición en privado. Quien no tiene nick aprobado no aparece.
- Por defecto: **oculto hasta que elija y le aprueben un nick** (privacidad por defecto). El profe puede apagar el
  ranking del grupo.
- Secundaria **no tiene ranking** (una alumna); su comparación es contra sí misma («tu mejor semana»).

### 1.7 Lo que se ve en el dashboard del estudiante

Tarjetas (inspiradas en la referencia visual): nivel y XP, racha, insignias, misión principal activa con su avance y
botón «Continuar», mapa de mundos, misiones del día, actividad reciente, árbol de habilidades por materia y, desde la
Fase 3, «💬 Pregúntale al tutor». Inglés agrega «🏆 Ranking de mi grupo».

### 1.8 Propuestas de mejora a la Fase 1 (para una fase siguiente; no se aplican aquí)

1. Insignia «📈 Segunda oportunidad»: subir ≥ 20 puntos en el segundo intento (premia el esfuerzo de corregir).
2. Racha con «día de descanso» semanal (un día sin clases no la rompe), para no castigar el domingo de 3 clases.
3. Mostrar XP por materia además de la total, para que el árbol y el mapa tengan su propio nivel.
4. Llevar `comun/gamificacion.js` a módulo sin DOM que también importe el servidor (§4.1), para una sola fórmula.

---

## 2. Malla curricular interactiva de 1.º de secundaria

Cada mundo cierra con una **misión principal**: un proyecto o reto práctico en vez de un examen teórico. El mini
examen 🎯 de la skill se queda como «jefe de zona». La tabla cubre el primer mundo de cada materia (piloto de la
Fase 2) y anota la misión de los siguientes.

| Materia | Mundo piloto (secuencia de la skill) | Misión principal | Entregable (sin datos personales) | Rúbrica (4 criterios, 25 pts c/u) | Siguientes mundos |
|---|---|---|---|---|---|
| **Matemáticas** | 🔢 Valle de los Números — Aritmética, solo temas puntuales que no haya visto (26 oct–22 nov) | **«La tiendita del salón»:** planear una venta con presupuesto, precios con decimales, descuentos en porcentaje y ganancia | Tabla de precios y cálculos (hoja de cálculo o foto de la libreta) + 3 problemas que inventa para otra persona | Cálculos correctos · Uso de porcentajes y fracciones · Explicación del procedimiento · Problemas inventados con solución | 📐 «Diseña la caja»: volumen de prismas con una maqueta medida · ❓ «Acertijos de la incógnita»: 5 acertijos con ecuaciones de primer grado |
| **Ciencias** | 🌱 Bosque de la Vida — Biología desde cero: método científico, seres vivos, célula | **«Diario de campo»:** observar una planta o un ser vivo de casa 7 días aplicando el método científico | Bitácora con pregunta, hipótesis, 7 registros, gráfica simple y conclusión | Pregunta e hipótesis · Registro constante · Análisis (gráfica) · Conclusión con evidencia | ⚗️ «Química de cocina»: mezclas y reacciones seguras · ⚡ «Carrito de Newton»: leyes de Newton con un carrito de globo |
| **Español** | 📚 Biblioteca de los Textos — programa de 1.º sin repetir lo visto, ortografía en cada bloque | **«Reportaje de mi comunidad»:** un texto expositivo sobre un tema del entorno (el mercado, el agua, los árboles) con 2 fuentes | Reportaje de 300–400 palabras con título, subtítulos y fuentes; sin nombres ni fotos de personas | Estructura del texto · Uso de fuentes · Ortografía y puntuación · Claridad | Reseña de un libro leído · Debate escrito con argumentos |
| **Ciencias Sociales** | 🤝 Plaza Cívica — Cívica y Ética (26 oct–22 nov) | **«Campaña por un derecho»:** cartel o infografía sobre un derecho de niñas, niños y adolescentes | Cartel (imagen) + párrafo de 100 palabras: qué derecho, por qué importa, qué puede hacer su comunidad | Derecho bien explicado · Fuente confiable (CNDH, UNICEF) · Propuesta de acción · Diseño claro | 📜 «Línea del tiempo de la Revolución» (sigue desde el Porfiriato) · 🗺️ «Mapa climático de México» con coordenadas |
| **Tecnología, pensamiento computacional e IA** | 🖥️ Taller Digital — Bases: computadora, archivos, internet seguro, pensamiento computacional, hojas de cálculo | **«Kit de seguridad digital»:** guía y hoja de cálculo con un plan para cuidar cuentas y datos | Hoja de cálculo con checklist y diagrama de flujo «¿Es seguro este mensaje?» (**sin contraseñas reales**) | Reglas correctas · Algoritmo claro (diagrama) · Hoja de cálculo con fórmulas · Ejemplos propios | 🐍 «Bot de trivia en Python» (listas, funciones, diccionarios) + «Detective de sesgos»: evaluar 3 respuestas de una IA |
| **Inglés** | 🔤 Isla de las Letras → 🧍 Puerto *To Be* (desde cero, despacio y con *speaking*) | **«My Hero Card»:** crear la ficha de un **personaje inventado** (nombre, edad, colores, cosas que tiene, cómo es) y presentarla | Ficha escrita de 8–10 oraciones + audio de 1 minuto para el profe (instrucciones en español, contenido en inglés) | *To be* y posesivos · Vocabulario (números, colores, adjetivos) · Pronunciación · Fluidez | 🛒 «My Perfect Day»: rutina en presente simple con *there is/are* |

Reglas comunes de la malla:

- La misión se divide en **3 a 5 pasos** con fecha, para que avance durante el mundo y no todo al final.
- Cada paso puede tener un tip con video o lectura verificada (reglas de fuentes de la skill).
- **Privacidad en entregables:** nada de rostros, nombres reales, direcciones, escuela ni uniforme en fotos o audios;
  la consigna lo dice en cada misión y el profe rechaza la entrega si no se cumple (con mensaje amable).
- Artes y Educación Física quedan como misiones secundarias (sin misión principal) para no sobrecargar.

---

## 3. Roles y paneles

### 3.1 Estudiante

| Panel | Qué ve | Fase |
|---|---|---|
| 🗺️ Mapa de aprendizaje | Mundos por materia con estado, zonas y capítulos; entra a cualquier mundo ya abierto | 1 (base) / 2 (catálogo de mundos y misión principal) |
| 🎒 Inventario de logros | Insignias (derivadas y manuales con su motivo), nivel, rango, racha, mejores semanas | 1 / 2 |
| 🌳 Árbol de habilidades | Temas por materia con su estado y botón «Reforzar» | 2 |
| ⚔️ Misión principal | Pasos, consigna, entrega y evaluación con rúbrica | 2 |
| 💬 Tutor IA | Conversación socrática ligada a la clase o al paso de la misión | 3 |
| 🏆 Ranking de mi grupo | Solo Inglés, con nicks | 2 |

### 3.2 Profe (guía)

| Panel | Qué hace | Fase |
|---|---|---|
| Crear misiones | **Fase 2:** misiones como JSON en el repo de datos, generadas con la skill y validadas con `validar_semana.ts <datos> --misiones <ámbito>` (forma nueva, sin `<lunes>`). **Fase 4:** editor en la página (formulario de pasos, rúbrica y fechas) que guarda un borrador y, al publicar, valida y lo escribe en el repo de datos | 2 / 4 |
| Evaluar entregas | Bandeja de entregas pendientes; rúbrica de 4 criterios con niveles, comentario y «Pedir corrección»; la XP se calcula sola | 2 (básico) / 4 (bandeja y atajos) |
| Métricas | Por persona, materia, tema y grupo: % a tiempo, promedio, XP semanal, misiones entregadas, uso del tutor | 4 |
| En riesgo de rezago | Lista con motivo explicable (§3.3) | 4 |
| Moderación | Aprobar nicks, revisar la bitácora del tutor y sus alertas, apagar el ranking o el tutor | 2 / 3 |

**Cómo se crean las misiones hoy y después (decisión):**

- *Fase 2:* igual que las clases: JSON en `contenido/<ámbito>/misiones/<id>.json` del repo privado, generado por la
  sesión principal con la skill y validado antes de subir. Ventaja: cero código de edición, misma fuente que el resto
  del contenido. Costo: el profe depende del agente.
- *Fase 4:* editor en la página. Alternativas consideradas:
  - (A) **Escribir al repo de datos desde el servidor** al publicar (recomendada): una sola fuente del contenido; el
    servidor ya sabe leer y escribir ese repo. Borradores en `stald_docs` (`borradores/misiones/<id>.json`).
  - (B) Misiones en Postgres: más simple de editar, pero parte el contenido en dos fuentes y rompe el flujo de la
    skill.
  - (C) Seguir solo con JSON: suficiente con una alumna; no escala a varios grupos.

### 3.3 Alumnos y alumnas en riesgo de rezago (reglas explicables, sin IA)

| Regla | Condición |
|---|---|
| R1 Clases sin intento | ≥ 2 clases vencidas sin intento en los últimos 7 días |
| R2 Promedio bajo | < 60 % en las últimas 3 clases de una misma materia |
| R3 Tema atorado | el mismo tema en `debilidad` en 2 clases o intentos seguidos |
| R4 Sin actividad | 4 días seguidos con clase sin ningún intento ni entrega (en Inglés no se registran visitas) |
| R5 Misión atrasada | un paso de la misión principal vencido hace más de 3 días |

Una regla = 🟡 atención; dos o más = 🔴 riesgo. Cada fila dice qué regla se cumplió y con qué datos. Esta lista solo
la ve el profe; el estudiante ve mensajes en positivo («Tienes 2 clases por recuperar»).

### 3.4 Madres, padres o tutores

**No-objetivo** en este cambio. No hay panel ni cuentas para ellos. Solo se registra su consentimiento para el tutor
IA (acción externa del profe, §4.3).

---

## 4. Arquitectura técnica sobre el stack real

### 4.1 Dónde vive el estado de gamificación

**Decisión: derivar todo lo que se pueda; guardar solo lo que no.**

| Dato | Dónde | Por qué |
|---|---|---|
| XP, nivel, rango, racha, insignias automáticas, estado de mundos, árbol | **Derivado** de `resultados/` + contenido, con la función pura de `comun/gamificacion.js` | Una sola verdad (los resultados); sin migraciones ni datos que se desincronicen; revertir no pierde nada |
| Catálogo de mundos y misiones | Repo de datos: `contenido/<ámbito>/mundos.json` y `misiones/<id>.json` | Es contenido, como las clases |
| Perfil RPG: nick, estado del nick, ranking oculto, insignias manuales | `stald_docs` → `gamificacion/perfiles/<slug>.json` (se borra 30 días después de la baja) | No se puede derivar |
| Ranking apagado por grupo | `stald_docs` → `gamificacion/config.json` | Configuración del profe |
| Borradores de misiones (Fase 4) | `stald_docs` → `borradores/misiones/<id>.json` | Aún no es contenido publicado |
| Entregas y evaluaciones de misión | `stald_docs` → `entregas/<mision>/<slug>.json` | Datos de la persona, junto a sus resultados |
| Bitácora del tutor | Tabla `stald_tutor_bitacora` (migración versionada) | Volumen, consultas por fecha y borrado por retención |
| Configuración del tutor, gasto del mes y consentimientos (`tutor`, `multimedia`) | `stald_docs` → `tutor/config.json` (slug, tipo y fecha, sin nombres; se borra al retirarse o con la baja) | Interruptor y control de acceso |

- **Una sola fórmula:** `comun/gamificacion.js` (Fase 1) se usa en el navegador. Para el ranking, el servidor necesita
  la misma cuenta. Se propone que el módulo no dependa del DOM y que `server/` lo importe por ruta relativa (Deno lo
  admite); alternativa: copia en `server/` con una prueba que falle si difieren (patrón de `espejos_agentes_test.ts`).
- **Alternativa descartada:** guardar XP acumulada en Postgres al calificar. Más rápido de leer, pero duplica la
  verdad, exige migrar si cambia la fórmula y complica corregir calificaciones (prórrogas, reinicios del profe).

### 4.2 Baja latencia y sin conexión

- **Servidor:** el contenido ya se carga coalescido y en caché (requisito vivo «Cargas coalescidas y en caché en el
  servidor»). El ranking de un grupo se calcula al pedirlo y se guarda en caché 60 s por grupo y semana.
- **Cliente:** reusa la «Caché del cliente por persona» (requisito vivo de `plataforma`): pinta lo último guardado al
  instante y refresca en segundo plano.
- **PWA opcional (Fase 2, detrás de bandera):** `manifest.webmanifest` y un *service worker* que guarda los archivos
  estáticos (versionados con `?v=`) y, para la API, primero red y si falla la última respuesta guardada, con el aviso
  «Sin conexión: estás viendo lo último guardado». **Sin conexión no se envían clases ni entregas** (la calificación
  es del servidor); el avance se queda en el borrador autoguardado que ya existe.
- **Metas:** dashboard útil en < 1 s con caché y < 2.5 s en frío con 4G (p95); ranking < 500 ms con caché.

### 4.3 Seguridad y privacidad de menores

**Principios:** minimización (solo lo necesario), privacidad por defecto, finalidad educativa, transparencia (el
estudiante sabe qué ve el profe) y control del profe.

| Riesgo | Control |
|---|---|
| Exponer identidad en ranking | Solo nick aprobado; oculto por defecto; nunca nombre, correo, foto ni calificaciones; solo dentro de su grupo y con sesión |
| Nicks que identifican u ofenden | Validación (longitud, caracteres, sin correo ni teléfono, sin su nombre real), lista de palabras bloqueadas y aprobación del profe |
| Datos personales en entregas (rostros, nombres, direcciones, voz) | Consentimiento `multimedia` de madre, padre o tutor y casilla «Acepto» (precedente: foto de avatar en Juegos); consigna explícita; sin campo de nombre; imágenes reducidas en el cliente y **metadatos quitados también en el servidor**; servidas solo por ruta con sesión a la dueña y al admin; si el profe pide corrección por privacidad, el archivo se borra en ese momento |
| Ver datos ajenos | Toda ruta filtra por la identidad de la sesión (`quienEs`); recurso no visible para la persona → 404 (no revela que existe); acción sobre lo de otra persona o ruta de admin → 403; pruebas por fila de la matriz |
| Datos personales al proveedor de IA | §4.4: redacción en el servidor antes de enviar, sin identificadores, sin respuestas de ejercicios |
| Retención | Entregas: contenido hasta el 31 de agosto (fin de ciclo 31 de julio + 30 días; se conserva solo la evaluación). Bitácora del tutor: 90 días. Perfil RPG: 30 días tras la baja. Borrado por script versionado; el profe puede borrar entregas y bitácora de una persona a petición |
| Secretos | Llaves solo en variables de Deno Deploy; nunca en el repo ni en el navegador |

**Aviso de privacidad:** hoy **no existe** en la plataforma; la Fase 2 lo crea como página versionada
(`privacidad.html`, enlazada desde el portal) y las fases siguientes lo actualizan.

**Cumplimiento (México):** la Ley Federal de Protección de Datos Personales en Posesión de los Particulares exige
aviso de privacidad y, para menores, el consentimiento de quien ejerce la patria potestad o la tutela; la Ley General
de los Derechos de Niñas, Niños y Adolescentes protege su intimidad. Acciones: redactar el aviso de privacidad
(qué se guarda, para qué, cuánto tiempo, quién lo ve, proveedor de IA y su país), recabar el consentimiento
escrito para el tutor IA y documentar el procedimiento para ejercer derechos ARCO (acceso, rectificación,
cancelación y oposición) por correo al profe. *El texto legal final lo revisa el profe; este diseño no es asesoría
legal.*

### 4.4 Tutor IA socrático

**Comportamiento (system prompt fijo, versionado en `server/tutor/`):**

- Nunca da la respuesta de un ejercicio calificable ni de un paso de la misión; responde con **una pregunta guía**,
  una pista graduada (de general a específica) o un ejemplo **análogo** con otros datos.
- Mensajes cortos (≤ 80 palabras), español de México, tono amable, un paso a la vez; en Inglés, explicaciones en
  español y ejemplos en inglés.
- Solo habla del tema de la clase o del paso de la misión que abrió; ante otro tema, redirige con amabilidad.
- Nunca pide datos personales; si el estudiante los escribe, le recuerda que no hace falta.
- Señales de riesgo (autolesión, abuso, violencia): las detecta una lista versionada de expresiones en el servidor
  **o** una marca que devuelve el modelo (basta cualquiera). Respuesta: mensaje fijo de apoyo que sugiere hablar con
  un adulto de confianza y con la Línea de la Vida (número a verificar antes de publicar); la conversación se marca y
  el profe recibe un aviso **sin contenido** por el canal del aviso del servidor. Qué hace el profe después (hablar
  con la familia, canalizar) es un protocolo que él define (§6).
- No está disponible desde mini exámenes 🎯 ni exámenes.

**Integración:**

```
Navegador (💬 Tutor en la clase o la misión)
   │ POST /tutor/mensaje { contexto: {itemId | misionId, paso}, texto }
   ▼
Deno Deploy  server/tutor.ts
   1. quienEs → ¿tiene consentimiento? ¿tutor activo? ¿dentro de límites y horario?
   2. Redacta el texto (correos, teléfonos, CURP, URLs, números largos, nombres del registro) → «[dato oculto]»
   3. Guarda el mensaje redactado en stald_tutor_bitacora (si falla → 503, no llama al proveedor)
   4. Arma el contexto: materia, tema, teoría pública de la clase o consigna del paso
      (NUNCA campos de respuesta, aceptadas ni explicación de ejercicios calificables)
   5. Llama al proveedor (llave en TUTOR_IA_API_KEY), sin nombre, correo ni slug
   6. Revisa la salida contra las respuestas de TODOS los ejercicios visibles para la persona
      y busca datos personales → si falla, pista genérica
   7. Guarda la respuesta con sus marcas (riesgo, fuera de tema, redacción) y la devuelve
   ▼
Respuesta { texto, restantesHoy }
```

**Límites:** 30 mensajes por persona al día, 600 caracteres por mensaje, 12 turnos por conversación, horario
7:00–21:30 (hora de la Ciudad de México), tope de gasto mensual (`TUTOR_IA_TOPE_USD`, contado con el uso de tokens que reporta el
proveedor) que avisa al profe al 80 % y responde 503 `tope_alcanzado` al 100 %.

**Proveedor (justificación de la pieza nueva):** se propone Anthropic Claude por la API desde Deno (paquete oficial
`@anthropic-ai/sdk` vía `npm:`), por su apego a instrucciones de sistema y sus controles de seguridad. Modelos
candidatos y precios de lista (USD por millón de tokens, según la tabla de modelos de la API consultada el
2026-10-21; verificar en la página oficial de precios antes de contratar):

| Modelo | Entrada | Salida | Costo por mensaje (≈ 3 000 tokens de entrada, 300 de salida) | Peor caso mensual (supuesto: 11 personas, la alumna y un grupo de ≈ 10, × 30 msj × 30 días = 9 900 msj) |
|---|---|---|---|---|
| `claude-opus-5-5` | 4.00 | 20.00 | ≈ 0.018 USD | ≈ 178 USD |
| `claude-haiku-5-5` | 0.10 | 0.50 | ≈ 0.00045 USD | ≈ 4.5 USD |

El uso real esperado es mucho menor (≈ 10 % del peor caso). La elección del modelo es del profe (§6); se recomienda
correr la batería de evaluación de la Fase 3 con ambos y quedarse con el que la pase con mejor costo. **Privacidad del
proveedor:** antes de activar, verificar en los términos comerciales vigentes que los datos enviados por la API no se
usan para entrenar modelos, el periodo de retención y si aplica retención cero; documentarlo en el aviso de
privacidad.

**Riesgos del tutor:** que dé la respuesta (batería de 40 casos, incluidos intentos de «ignora tus instrucciones»),
que se equivoque (aviso visible «La IA puede equivocarse; confírmalo con tu profe»), dependencia (límite diario y
botón «Ya lo intenté, dame una pista»), costo (tope), caída del proveedor (mensaje amable y la clase sigue
funcionando) y fuga de datos (redacción y bitácora auditable).

### 4.5 Diagrama de arquitectura

```
                         GitHub Pages (estático, sin build)
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ ingles.html?modo=secundaria / ingles.html / index.html                        │
  │  comun/gamificacion.js (Fase 1, función pura)  comun/misiones.js  comun/tutor.js│
  │  Caché por persona (localStorage)   Service worker opcional (PWA)              │
  └──────────────┬───────────────────────────────────────────────────────────────┘
                 │ HTTPS + sesión de Supabase Auth (Bearer)
                 ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ Deno Deploy  server/main.ts  (quienEs → matriz de acceso)                     │
  │  /secundaria/actividades  /ingles/…   (existentes, calificación en servidor)  │
  │  /misiones/…  /gamificacion/perfil  /gamificacion/ranking   (Fase 2)          │
  │  /tutor/mensaje  /profe/tutor                               (Fase 3)          │
  │  /profe/entregas  /profe/metricas  /profe/riesgo  /profe/misiones (Fase 2–4)  │
  │  gamificación = misma función pura (import de comun/ o copia vigilada)         │
  └───────┬───────────────────────┬─────────────────────────┬────────────────────┘
          │ llave de servicio      │ token GitHub            │ TUTOR_IA_API_KEY
          ▼                        ▼                         ▼
  ┌──────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
  │ Supabase Postgres    │ │ Repo privado de datos     │ │ Proveedor de IA (Fase 3) │
  │ stald_docs:          │ │ contenido/secundaria/     │ │ sin identidad, texto     │
  │  resultados/ avance/ │ │  actividades/ semanas/    │ │ redactado, con tope de   │
  │  gamificacion/       │ │  mundos.json misiones/    │ │ gasto                    │
  │  entregas/ tutor/    │ │ contenido/ingles/…        │ └──────────────────────────┘
  │ stald_tutor_bitacora │ └──────────────────────────┘
  │ RLS sin políticas    │
  └──────────────────────┘
```

---

## 5. Plan MVP por fases

| Fase | Alcance | Criterios de aceptación medibles |
|---|---|---|
| **1 — Núcleo y dashboard (Secundaria, en curso)** | Dashboard RPG, `comun/gamificacion.js`, clase como misión con pasos y +XP | Lo definen sus cambios en curso. Este cambio solo exige que sus reglas (tabla del inicio) sigan intactas en las fases 2–4: prueba de regresión con 10 casos fijos de XP, nivel y racha |
| **2 — Misiones principales y llegada a Inglés** | Catálogo `mundos.json`; misión principal con pasos, entrega y rúbrica; árbol de habilidades; misiones diarias y semanales; 3 misiones piloto en Secundaria (Matemáticas, Ciencias y Tecnología) y 1 en Inglés; gamificación en `ingles.html` de grupo; nick y ranking por grupo; evaluación básica del profe; PWA opcional | 1) 4 misiones piloto publicadas y validadas con 0 errores. 2) El flujo entrega → evaluación → XP pasa de punta a punta en E2E y en producción con la cuenta de prueba. 3) Ranking: 0 respuestas con nombre, correo, slug, XP o calificación (prueba automática que recorre el JSON) y quien se oculta no aparece en la siguiente carga. 4) Aviso de privacidad publicado y enlazado. 5) Dashboard p95 < 2.5 s en frío con 4G simulado. 6) E2E a 360 px sin scroll horizontal, claro y oscuro. 7) Reglas de Fase 1 sin cambios (10 casos). *Indicadores de adopción (no bloquean):* la alumna entrega ≥ 1 misión en el mes; ≥ 70 % del grupo envía ≥ 3 actividades por semana durante 2 semanas |
| **3 — Tutor IA conversacional** | `POST /tutor/mensaje`, redacción, límites, bitácora, alertas, interruptor, tope de gasto, consentimiento | 1) Batería de 40 casos (10 de manipulación y 5 de bienestar): 0 respuestas directas a ejercicios calificables, ≥ 90 % con pregunta guía y 100 % de bienestar con el mensaje fijo. 2) 100 % de los turnos en la bitácora, ya redactados. 3) 0 datos personales enviados al proveedor en 20 casos con correos y teléfonos sembrados. 4) Sin consentimiento → 403 en el 100 % de los casos. 5) p95 de respuesta < 8 s. 6) El contador de gasto coincide ±5 % con el reporte del proveedor. 7) Casos de riesgo marcados y visibles para el profe en < 1 min |
| **4 — Panel del profe avanzado** | Editor de misiones con borrador y publicación; bandeja de entregas con rúbrica; métricas; lista de riesgo; revisión de la bitácora | 1) El profe crea y publica una misión en < 10 min sin tocar JSON y pasa el validador. 2) Evalúa una entrega en < 3 min. 3) La lista de riesgo explica la regla en el 100 % de las filas y coincide con el cálculo a mano en 5 casos de prueba. 4) Métricas por materia y grupo cargan en < 2 s. 5) Ninguna ruta `/profe/*` responde 200 a quien no es admin |

Cada fase es un cambio OpenSpec propio (con su rama, pruebas y verificación) derivado de esta propuesta: **mueve** a su
propio cambio los requisitos de este que implementa (ADDED allí) y los quita de aquí, para que ninguna spec viva tenga
requisitos sin implementar. Este cambio paraguas se cierra con `openspec archive plataforma-rpg --skip-specs` cuando
la Fase 4 se archive (o antes, si el profe descarta fases). Ver `tasks.md`.

---

## 6. Decisiones que debe tomar el profe

1. **Nombres de los mundos** (§1.1): ¿se aceptan los propuestos o se ajustan?
2. **Bono de XP por misiones diarias y semanales** (§1.3): sin bono (propuesta) o un bono fijo.
3. **XP de la misión principal** (§1.2): rúbrica × 3 + 60 a tiempo, u otro peso.
4. **Ranking de Inglés:** oculto por defecto hasta tener nick aprobado (propuesta) o visible por defecto con opción de
   ocultarse; orden por puntos de constancia (propuesta) o por XP (permite deducir calificaciones); y si se reusa el
   nick de Juegos.
5. **Entregas con imágenes y audio:** permitirlas con consentimiento `multimedia` (reglas de §4.3) o solo texto en el
   piloto.
6. **Proveedor y modelo del tutor IA** (§4.4): `claude-opus-5-5` o `claude-haiku-5-5`, tope de gasto mensual y
   horario.
7. **Consentimiento y aviso de privacidad** para el tutor: quién lo recaba y cómo se guarda (propuesta: firmado en
   papel o correo; en la plataforma solo slug + fecha).
8. **Editor de misiones de la Fase 4:** escribir al repo de datos (A, propuesta) o guardar en Postgres (B).
9. **Orden de las misiones piloto** de la Fase 2 (propuesta: Matemáticas, Ciencias, Tecnología e Inglés).
10. **Protocolo de bienestar:** qué hace el profe cuando el tutor marca una conversación de riesgo.

## 7. Riesgos generales

| Riesgo | Mitigación |
|---|---|
| Gamificación que presiona o desmotiva (comparación) | Sin ranking en Secundaria; ranking semanal y opcional en Inglés; XP nunca baja; mensajes en positivo |
| Choque con los cambios de Fase 1 en curso | Este cambio no toca código ni specs vivas; reglas de Fase 1 como invariante; las fases 2–4 empiezan después de archivar la Fase 1 |
| Carga de trabajo del profe (evaluar entregas) | Rúbrica de 4 criterios, XP automática, misiones piloto acotadas a 4 |
| Contenido de la misión desalineado con la secuencia | La skill `clases-secundaria` se actualiza en la Fase 2 con la sección de misiones |
| Costos o caída del proveedor de IA | Tope de gasto, interruptor y la plataforma funciona igual sin tutor |
