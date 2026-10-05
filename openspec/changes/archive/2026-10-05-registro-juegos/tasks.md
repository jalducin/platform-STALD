## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/registro-juegos`

## 1. Pruebas que fallan (TDD)

- [x] 1.1 `e2e-login.js`:
  - botón visible del portal → entrada de Juegos;
  - correo desconocido → invitación (sin «No encontré») y cuenta creada;
  - `?juegos=1` → Juegos.

## 2. Implementación

- [x] 2.1 Portal: bloque «¿Solo vienes a jugar?», invitación para correo sin clases y `?juegos=1`
- [x] 2.2 Juegos: textos de entrada y de «Crea tu cuenta de Juegos»

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Ajustar las E2E que esperaban «No encontré» o «invitado» en los textos

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Unitarias del servidor, check y lint en verde
- [x] 4.2 E2E `login`, `portal` y `juegos` con `tests/e2e/correr.sh`
- [x] 4.3 Reporte en `openspec/changes/registro-juegos/reports/AAAA-MM-DD-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Tras el merge, la página publicada muestra el botón y `?juegos=1` lleva a Juegos (solo lectura)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 README: cómo compartir el enlace de registro a Juegos
