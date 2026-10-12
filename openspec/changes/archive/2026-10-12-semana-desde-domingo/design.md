## Decisions

- **Una sola regla, `abreYa(disponibleDesde, hoy)`:** es verdad si `hoy >= disponibleDesde` o si hoy es domingo y
  `disponibleDesde` es el lunes siguiente.
  - La usan `estadoItem` (lista, abrir y enviar), el material del Meet y el resumen del profe, para que todas las
    rutas coincidan.
- **Visibilidad:** una semana se ve si su id (lunes) es `<= hoy` o si es `lunesSiguiente(hoy)`.
  - `semanaActual` sigue siendo la semana que contiene hoy, para no esconder lo del domingo (la 2.ª oportunidad del
    examen, el Meet y Tecnología e IA).
  - La siguiente llega aparte como `semanaSiguiente`, y la página la muestra en «⏩ Adelanta la próxima semana».
- **Sin cambios en datos:** `disponibleDesde` se queda en el lunes; el adelanto lo decide el servidor.
