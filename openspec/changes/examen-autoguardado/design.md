## Decisiones

### 1. Autoguardado (`ingles/reproductor.js`)
1. **Dónde.** `localStorage` del navegador. Alternativas descartadas:
   - `sessionStorage`: se pierde si el navegador descarta la pestaña o se cierra la app;
   - guardar en el servidor: exige endpoint, escrituras por respuesta y datos de menores en tránsito; el pedido es
     «en el aparato».
2. **Clave.** `stald_borrador:<ámbito>:<hash del correo>:<id del elemento>:<intento>`.
   - Ámbito: `ingles`, `profe` o `secundaria` (el mismo id podría existir en dos ámbitos).
   - Hash: FNV-1a de 32 bits del correo en minúsculas, en base 36. No es criptográfico: solo evita dejar el correo
     en claro en el aparato y separa a dos personas que usan el mismo.
3. **Valor.** `{ "v": 1, "t": <ms de la última escritura>, "r": { "<id de pregunta>": <índice | texto> } }`. Es la
   misma forma que `examAnswers(form)`, así que lo que se envía y lo que se guarda no pueden divergir.
4. **Cuándo se guarda.** En `updateExamProgress(form)`, que ya corre en cada `change`, `input` de `.q-text` y
   respuesta de pronunciación. Sin respuestas se borra la clave. No se guarda en la vista previa del admin
   (`form.dataset.borrador` vacío).
5. **Restauración.** Al terminar `openItem` se lee la clave del intento abierto y se aplica por id de pregunta:
   - radio: se marca `input[name=id][value=v]` si existe y no está deshabilitado;
   - escritura y pronunciación: se pone el valor en `input.q-text` habilitado (en pronunciación, además «Respuesta
     recuperada»);
   - ids que ya no existen o preguntas fijas de la corrección se ignoran (las fijas están deshabilitadas y
     `examAnswers` tampoco las lee);
   - aviso «Recuperamos tus N respuestas» (`#autoguardado-aviso`, con clase propia `.autoguardado-aviso`: no usa
     `.aviso-corr`, que identifica la corrección del intento 2), y en modo paso `mostrarPaso` a la primera sin
     contestar.
   La selección de preguntas es determinista por intento (semilla en el servidor), así que mapear por id basta.
6. **Borrado.** Al enviar con éxito (`submitExam`, `r.ok`). Al abrir el intento N se borran los de intentos
   anteriores del mismo elemento. Si el elemento ya está terminado (409 al abrir) se borran todos los suyos.
   «Cerrar sesión» (`cerrarSesion` de `ingles/app.js`) borra todos los `stald_borrador:`; la sesión vencida no
   (es justo cuando el avance importa).
7. **Caducidad.** Al cargar `reproductor.js` y al abrir un elemento se borran los borradores con `t` de hace más
   de 14 días o ilegibles.
8. **Avisos.** Debajo de la barra de progreso, `#autoguardado` (texto pequeño, `muted`): «Tu avance se guarda solo
   en este aparato ✔» y, tras cada guardado, «· Guardado hace un momento»; pasado un minuto, «· Guardado hace N
   min» (se refresca cada 30 s mientras exista el formulario).
9. **Sin jalar para recargar.** Un `MutationObserver` sobre `#content` pone `html.examen-abierto` mientras exista
   `#exam-form`; el CSS aplica `overscroll-behavior-y: contain` a `html` y `body`. Así no hay que tocar cada ruta
   que reemplaza el contenido.
10. **Al salir.** `beforeunload` pide confirmación solo si existe `#exam-form` con borrador y al menos una
    respuesta. El avance ya está guardado; el aviso evita la sorpresa.
11. **Errores de almacenamiento.** Todo acceso a `localStorage` va en `try/catch`: sin almacenamiento (modo
    privado, cuota llena) el examen funciona como antes y el aviso no se muestra.

### 2. «¿No te llegó?» (`comun/auth.js`, `index.html`)
1. `StaldAuth.ayudaReenvio(el, correo)` pinta en `el` el bloque de ayuda, el botón y la línea de resultado, y
   conecta el botón a `enviarEnlace(correo)`. La usan `pintarEntrada` → `paso2` (Juegos, Inglés, Secundaria) y
   `pasoCodigo` del portal (`#code-ayuda`), así el texto vive en un solo lugar.
2. **Espera.** Tras cada envío (también el primero, que acaba de ocurrir) el botón queda deshabilitado con «Puedes
   pedir otro en N s» durante 60 s; luego vuelve a «📧 Reenviarme el enlace». El temporizador se detiene si el
   bloque ya no está en la página. Las pruebas pueden acortar la espera con `window.__REENVIO_SEGUNDOS`.
3. **Resultado.** Éxito: «✔ Te mandamos otro enlace a <correo>.» Error: el mensaje de `enviarEnlace` tal cual
   (incluido el de límite de Supabase) y el botón se habilita.
4. **Modo de prueba.** Con el verificador falso (`/config { prueba: true }`), `enviarEnlace` ya resuelve sin red.
5. Estilos propios (`.stald-ayuda`), inyectados con `ponerCss()` para que se vean igual dentro y fuera de
   `.stald-auth`.

## Pruebas
- E2E nueva `e2e-autoguardado` (fase `ingles`, celular 390 px) con un examen exclusivo de prueba
  `sec-e2e-guardado` (opción múltiple y respuesta escrita) en `tests/fixtures/datos/`, para no gastar las
  oportunidades de `sec-e2e` que usa `examen-secundaria`:
  - aviso de guardado visible; contestar 1 radio y 1 escrita; el borrador existe y no contiene el correo;
  - recargar (confirmación del navegador) → reabrir: respuestas restauradas, aviso «Recuperamos tus 2
    respuestas», modo paso en la primera sin contestar, `html.examen-abierto`;
  - «← Volver» y reabrir también restaura;
  - borrador caducado (> 14 días) se borra al cargar;
  - enviar → resultado, sin borrador y sin `examen-abierto`.
- `e2e-login`: ayuda visible en el paso del código del portal y de Juegos; el botón reenviar empieza
  deshabilitado con cuenta regresiva, se habilita, al tocarlo avisa el envío y vuelve a la cuenta regresiva.
- Sin cambios de servidor: las unitarias de Deno corren como regresión.
