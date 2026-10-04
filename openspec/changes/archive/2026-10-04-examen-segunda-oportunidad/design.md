## Decisiones

### 1. Modelo
- `Item.segundaOportunidad?: string` (solo exámenes, con `intentos: 2`).
- `EstadoItem` gana `"en-espera"`: es un examen con 1 intento usado y `hoy < segundaOportunidad`.

### 2. Motor (`server/motor.ts`)
- `estadoItem`:
  - con todos los intentos usados → completo;
  - si es examen, tiene `segundaOportunidad`, lleva 1 intento usado y `hoy < segundaOportunidad` → `en-espera`;
  - el resto, como hasta ahora.
- `fueraDeTiempoDe(it, n, hoy)`: para `n = 2` con `segundaOportunidad`, se compara con esa fecha; en los demás
  casos, con `fechaLimite`.
- `validateItem`:
  - con `segundaOportunidad`, la fecha debe ser válida, posterior a `fechaLimite` y con `intentos` igual a 2;
  - sin `segundaOportunidad`, un examen con `intentos: 2` es válido (por compatibilidad), pero el validador de
    semana da un aviso.
- La selección del intento 2 ya es distinta (semilla `id|slug|2`) y `correccionDe` no aplica a exámenes, así que
  no hay cambios ahí.

### 3. Rutas (`server/actividades.ts`)
- `GET/POST` de un examen en espera → 403 `{ error: "segunda_pronto", desde }`.
- `meta()` incluye `segundaOportunidad`.
- `paraProfe` quita `segundaOportunidad`: el profe no espera.

### 4. Página
- `accionItem` con estado `en-espera` muestra "Ver resultado" y la píldora "2.ª oportunidad <fecha>".
- Con estado `en-curso` en un examen, el botón dice "2.ª oportunidad".
- El resultado del 1.er intento avisa: "Tienes una 2.ª oportunidad el <fecha>. Cuenta la mejor."
