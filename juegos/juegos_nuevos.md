# Prompt de Desarrollo: Sistemas de Juego Avanzados (Plataformas 2D y Carreras Arcade)

## Contexto y Visión de Diseño experta

Este documento define las reglas, mecánicas de juego, progresión y una serie de **mejoras de diseño expertas** para dos géneros clásicos adaptados a un motor de desarrollo genérico. Como diseñadores senior, el objetivo es elevar la rejugabilidad, equilibrar la curva de dificultad (frustración vs. desafío) y modernizar los sistemas de retroalimentación (feedback loop) para un estándar contemporáneo sin perder la esencia retro.

## 1. Sistema de Juego: Plataformas de Desplazamiento Lateral

### Objetivo del Juego

Superar 12 mundos secuenciales, derrotar a un jefe de sección al final de cada uno y completar el nivel final superando al antagonista principal.

### Estructura de Progresión y Mejoras de Diseño

* **Mundo Temático (12 Mundos de Campaña):** Estructura extendida de 12 mundos con ambientación y físicas modificadas progresivamente según el entorno:
  1. *Pradera Verde* (Físicas base de control equilibrado).
  2. *Desierto Árido* (Inercia de deslizamiento moderada y corrientes de viento cruzado).
  3. *Región Subacuática / Arrecife* (Físicas de flotabilidad y restricción de salto).
  4. *Cavernas Subterráneas* (Visibilidad reducida y peligros de estalactitas).
  5. *Arquitectura Gigante* (Escalas alteradas donde los elementos pequeños cobran proporciones masivas).
  6. *Altitudes del Cielo* (Plataformas móviles flotantes y corrientes de viento verticales).
  7. *Tundras de Hielo* (Fricción mínima en suelo, deslizamiento extendido al frenar).
  8. *Laberinto de Tuberías y Mecanismos* (Zonas de ritmo acelerado y teletransportación rápida).
  9. *Jungla Salvaje* (Vegetación interactiva, lianas colgantes y peligros de fauna reativa).
  10. *Volcán Activo* (Plataformas colapsables y obstáculos de lava con temporizador).
  11. *Ruinas Ancestrales de Cielos Nocturnos* (Gravedad flotante intermitente y plataformas fantasma).
  12. *Dominio Oscuro / Fortaleza Final* (Diseño de nivel no lineal, alta densidad de enemigos y jefe multietapa).

* **Mapa General (Overworld):** Navegación lineal ampliada con bifurcaciones opcionales (rutas de alta dificultad con recompensas mayores). Los niveles completados permiten el re-jugado (*replayability*) para la búsqueda de coleccionables.

* **Tipos de Nodos en el Mapa:**
  * Niveles estándar.
  * Zonas de bonificación/recompensas cronometradas.
  * Desafíos de minijuegos con tablas de clasificación locales.
  * Fortalezas (con puntos de control intermedios y variantes de subjefes dinámicos).
  * Puntos de cierre de mundo (vehículos aéreos o fortalezas principales).

* **Enemigos Ambulantes Inteligentes:** Entidades que patrullan el mapa. Ahora cuentan con un radio de visión y persecución acotado, permitiendo al jugador esquivarlos con estrategia o planificar el combate táctico.

* **Mejora Experta - Modo Asistido / Checkpoints Modernos:** Incorporación de puntos de control opcionales (banderas o checkpoints de medio nivel) para mitigar la frustración por pérdida total de progreso en niveles largos, manteniendo el modo clásico intacto ("Modo Arcade Puro").

### Reglas de Estado y Vidas (Revisión de Economía)

* **Condición de Daño/Pérdida:** El personaje pierde una vida si recibe daño en estado base, cae fuera de los límites del mapa o se agota el tiempo límite. Se añade un período breve de *invulnerabilidad post-daño (i-frames)* de 1.5 segundos para evitar castigos injustos ("muertes baratas").

* **Economía de Vidas Rebalanceada:** Acumular 100 unidades de moneda otorga una vida extra, pero las monedas también sirven como moneda de cambio global en las tiendas del overworld.

* **Recompensa de Fin de Nivel:** Sistema de ruleta por cartas mejorado con un componente de habilidad (detener la ruleta mediante un comando de tiempo exacto en lugar de azar puro).

* **Alternancia de Jugadores:** Sistema cooperativo asíncrono o simultáneo (opcional) donde los jugadores pueden revivirse mutuamente mediante burbujas de rescate estilo moderno.

### Sistema de Mejoras (Power-ups) y Profundidad de Combate

| Ítem | Efecto en el Personaje y Modificador de Jugabilidad | 
| ----- | ----- | 
| Champiñón base | Expande el tamaño y otorga tolerancia a un golpe con animación de recuperación fluida. | 
| Proyectil de fuego | Habilita ataques a distancia con rebote físico en superficies estáticas. | 
| Hoja de desplazamiento | Otorga ataque cuerpo a cuerpo giratorio y planeo con inercia inercial ajustable. | 
| Traje camuflaje | Combina planeo y estado estático de invisibilidad/invulnerabilidad (con un medidor de uso limitado para evitar abusos). | 
| Traje anfibio | Optimiza el desplazamiento acuático con propulsión libre en 360 grados. | 
| Traje de impacto | Ataques en caída picada ("ground pound") que destruyen bloques y generan ondas expansivas locales. | 
| Estrella de invulnerabilidad | Inmunidad temporal con aceleración de velocidad de movimiento y música dinámica adaptativa. | 
| Objeto de salto de fase | Mecánica de "salto inteligente" que analiza el nivel y otorga un atajo desbloqueable. | 

### Inventario de Mapa (Gestión de Objetos Estratégica)

* **Nube de Salto:** Omite un nivel bloqueado de alta dificultad.
* **Martillo Rompedor:** Destruye obstáculos del overworld revelando cuevas de tesoros ocultos.
* **Instrumento de Salto:** Permite viaje rápido bidireccional entre mundos ya visitados.
* **Ancla de Retención:** Fija la posición de los enemigos móviles en el mapa durante 3 turnos.
* **Caja de Melodía:** Induce letargo zonal en los enemigos del mapa, permitiendo limpiar rutas completas.

## 2. Sistema de Juego: Carreras Arcade de Karts

### Objetivo del Sistema

Competir en circuitos dinámicos, dominar las físicas de derrape avanzado, acumular puntaje global en el modo Gran Premio y desbloquear personalizaciones estéticas y mecánicas.

### Estructura de Competencia y Profundidad

* **Circuitos:** 32 pistas (50% nuevas, 50% clásicas remasterizadas) con elementos interactivos de pista en tiempo real (clima dinámico, atajos desbloqueables por interruptores de impacto).
* **Participantes:** 8 corredores con IA adaptativa (el sistema ajusta dinámicamente la agresividad de la IA según la posición del jugador para mantener la tensión competitiva -"Rubberbanding" controlado y justo-).
* **Clasificación de Velocidad:** 50cc, 100cc, 150cc, 200cc (alta velocidad experta) y modo espejo.
* **Sistema de Puntuación Justo:** Puntuación balanceada por posición con bonificaciones por rendimiento limpio (cero impactos recibidos o derrapes perfectos continuos).

### Mecánicas de Conducción Avanzadas

* **Derrape Multi-Etapa (Mini-Turbo Pro):** Sistema de carga de tres niveles de chispas (Azul -> Naranja -> Morado), donde el nivel morado otorga un super-impulso de alta velocidad condicionado a la habilidad de trazado de curvas.
* **Planeador con Control Aerodinámico:** Capacidad de inclinar el morfo del planeador hacia arriba o abajo para ganar altura a cambio de velocidad o planear en picada para ganar velocidad pura al aterrizar.
* **Físicas Subacuáticas y Acrobacias Aéreas:** Realizar piruetas al saltar desde rampas otorga un mini-impulsor al tocar el suelo, fomentando el riesgo/recompensa constante.
* **Economía de Monedas de Riesgo:** Recolección de hasta 15 monedas por carrera. Cada moneda incrementa un 0.5% la velocidad punta, pero perderlas por un impacto punitivo genera una penalización de aceleración momentánea.
* **Salida con Impulso de Precisión:** Ventana de tiempo justa (milisegundos exactos) antes del banderazo de salida para obtener el máximo turbo inicial.

### Modularidad y Personalización Profunda de Vehículos

El rendimiento del vehículo se calcula mediante un motor de físicas basado en la sinergia de tres módulos:
1. **Chasis** (Define peso base, inercia y resistencia a colisiones).
2. **Neumáticos** (Determinan el agarre en asfalto, tierra, hielo y la pérdida de velocidad fuera de pista).
3. **Planeador** (Modifica la sustentación y el control giroscópico en secciones aéreas).
   *Las piezas se desbloquean mediante desafíos de rendimiento en pista y no solo por acumulación pasiva.*

### Sistema de Ítems (Equilibrio Competitivo y "Catch-up")

* **Ítems Ofensivos y Defensivos Dinámicos:** Asignación de objetos basada en la posición actual en la carrera (los jugadores rezagados reciben objetos de alto impacto como el rayo o caparazones guiados avanzados; los líderes reciben objetos de control táctico o defensivo como plátanos triples y bocinas de área).
* **Gestión de Doble Ítems:** Capacidad opcional de almacenar hasta dos objetos simultáneamente para introducir capas de estrategia táctica sobre cuándo gastar o retener recursos.

### Modos de Juego y Retención

* Gran Premio, Contrarreloj (con soporte de fantasmas descargables de la comunidad), Carrera VS personalizable y Modo Batalla avanzado (combates por eliminación de globos con zonas de regeneración táctica).
* Soporte multijugador local de pantalla dividida, matchmaking en línea basado en habilidad (SBMM) y torneos temporales comunitarios.

## 3. Matriz Comparativa de Arquitectura y Reglas

| Parámetro | Módulo A: Plataformas 2D | Módulo B: Carreras Arcade | 
| ----- | ----- | ----- | 
| **Género base** | Desplazamiento lateral / Acción táctica | Simulación arcade de vehículos de alta velocidad | 
| **Estructura de avance** | Mapa ramificado estructurado por 12 mundos | Copas cerradas de 4 circuitos con copas espejo | 
| **Condición de fallo** | Extinción de vidas o agotamiento de tiempo | Posicionamiento final inferior en la tabla de puntos | 
| **Sistema de progresión** | Desbloqueo de trajes, habilidades y rutas de overworld | Desbloqueo modular de piezas de vehículo y desafíos de pista | 
