## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/borrador-en-servidor`

## 1. Servidor (TDD)

- [x] 1.1 `server/borrador_test.ts` en rojo
- [x] 1.2 `borradores/` en `PREFIJOS_INGLES`; ruta `PUT …/<id>/borrador`; `borrador` en el GET; borrar al enviar

## 2. Frontend

- [x] 2.1 `reproductor.js`: guardar en la cuenta (espera de 2.5 s, al ocultar la pestaña y reintento en `online`);
  restaurar la copia más reciente; aviso nuevo

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `e2e-autoguardado.js`: otro contexto del navegador y borrador borrado al enviar; textos del aviso

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Unitarias, lint y check; E2E de la fase `ingles` (incluidas `--pg`); reporte

## 5. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 CI en verde antes del merge; verificar en producción que `PUT …/borrador` sin sesión se rechaza y que la
  página publicada trae el guardado en la cuenta

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (`borradores/`), `docs/backend-standards.md` (ruta) y `docs/frontend-standards.md`
  (regla del borrador)
