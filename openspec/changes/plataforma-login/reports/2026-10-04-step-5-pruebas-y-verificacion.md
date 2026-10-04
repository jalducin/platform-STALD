# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: plataforma-login (Sprint 3)
- Agente: Claude Code (Opus 5.5), worktree aislado, rama `feature/plataforma-login`

## Comandos ejecutados

- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts herramientas/alta-usuarios-auth.ts`
- `npx -y deno lint server/ herramientas/alta-usuarios-auth.ts`
- `npx -y deno run -A herramientas/alta-usuarios-auth.ts --correos <lista de prueba> --prueba` (sin red)
- Servidor local: `DATA_DIR=<copia> ROWS_FIXTURE=<scratchpad>/rows-fixture.json SUPER_ADMIN_EMAIL=admin@example.com
  PORT=8807 npx -y deno run -A server/main.ts` y estáticos `python -m http.server 8785 --bind 127.0.0.1`
  (sin variables `SUPABASE_*`).
- Segunda corrida del servidor con `LOGIN_TRANSICION_HASTA=2026-01-01` (fecha posterior simulada).
- E2E (Playwright, en `scratchpad/s3/`, copias ajustadas; los originales no se tocaron): `e2e-login.js` (nuevo),
  `e2e-login-despues.js` (misma prueba, fase posterior), `e2e-portal.js`, `e2e-juegos.js`, `e2e-partidas.js`,
  `e2e-enlace-sala.js`.
- `curl` contra el API local (verificación manual, ver abajo).

## Resultados de pruebas

- Unitarias nuevas: `server/auth_test.ts` 12, `server/auth_main_test.ts` 5, `server/alta_usuarios_auth_test.ts` 2.
  Se comprobó el rojo (sin `server/auth.ts` la prueba no compila) antes de implementar.
- Suite completa `deno test -A server/`: **189 pasaron, 0 fallaron, 6 omitidas** (las 6 omitidas ya lo estaban:
  requieren la copia del repo de datos).
- `deno check`: sin errores. `deno lint`: 49 archivos, sin hallazgos.
- E2E:

| Prueba | Resultado |
|---|---|
| `e2e-login` (transición) | 35 PASS, 0 FAIL |
| `e2e-login-despues` (fecha posterior) | 6 PASS, 0 FAIL |
| `e2e-portal` (regresión, ajustada a la entrada con código) | 16 PASS, 0 FAIL |
| `e2e-juegos` (regresión, sesión de prueba) | 26 PASS, 0 FAIL |
| `e2e-partidas` (regresión, sesión de prueba) | 15 PASS, 0 FAIL |
| `e2e-enlace-sala` (regresión, invitada entra con código) | 8 PASS, 0 FAIL |

`e2e-login` cubre: admin con `?email=` sin token → 401; token falso inválido → 401 `sesion_invalida`; el correo
sale del token y no de la URL; portal: correo → «📧 Enviarme el enlace» → «Revisa tu correo ✉️» → código → inicio;
`/perfil` con `Authorization` y sin `?email=`; Juegos con la sesión (crea sala, otra persona se une, todas las
peticiones llevan el token); 🚪 Cerrar sesión regresa a la entrada y Juegos también la pide; entrada con código desde
Juegos; Secundaria con token y su cierre de sesión; admin: correo viejo sin sesión → entrada, con sesión → «🔗 Enlace
de acceso» (503 claro en local, sin llave de servicio); transición: alumna con correo viejo entra, ve «🔒 Activa tu
acceso seguro» y lo activa; invitado nuevo con sesión → registro en Juegos. `e2e-login-despues`: alumna con
`?email=` → 401 `inicia_sesion` y las tres páginas muestran la entrada con aviso.

Ajustes a las regresiones: entrar con `stald_sesion_prueba` en lugar de `stald_email`; paso del código en el
portal; ignorar `OPTIONS` (verificación previa por el encabezado `Authorization`) en «sin envíos»; el admin ve 4
tarjetas (la de «Mi ruta», del cambio `ruta-profe`, ya existía y la prueba estaba desactualizada); «cerrar sesión en
Inglés» se cambió a cerrar desde el portal, porque `ingles.html` lo integra el Sprint 2.

## Verificación manual (API, EL AGENTE EJECUTÓ)

| Caso | Resultado |
|---|---|
| `OPTIONS /perfil` | 200, `access-control-allow-headers: content-type, authorization`, `max-age: 86400` |
| `GET /config` (local) | `{"prueba":true}` |
| `POST /auth/enlace` con sesión de alumna | 403 `solo_admin` |
| `POST /auth/enlace?email=admin…` sin token | 401 `inicia_sesion` |
| `POST /auth/enlace` admin con correo inválido | 400 `correo_invalido` |
| `GET /salud` sin sesión | 200 |
| `GET /juegos/foto/<token>` sin sesión | 404 `not_found` (no pide sesión) |
| `alta-usuarios-auth.ts --prueba` | 2 válidos (sin duplicados), 1 inválido, código 1, sin red; sin `--correos` → código 2 |

## Verificación de estado

- Antes: copia de datos en `scratchpad/s3/data-x` (de `scratchpad/data`, sin `.git`); `scratchpad/data` intacto.
- Después: el servidor usa `MemoryStore` (no escribe en disco ni en GitHub); los invitados creados por los E2E
  vivieron solo en memoria y se descartaron al detener el servidor.
- Sin variables `SUPABASE_*`: no se escribió en tablas `stald_` ni en Supabase Auth.
- Servidores de los puertos 8807 y 8785 detenidos al terminar.
- Estado restaurado: Sí.

## Supabase Auth en producción (pasos para el profe)

Proyecto `eolsklubeywfmuyrtxla` (*Portafolio*; compartido con el portafolio, que hoy no usa Auth).

1. **Token de la Management API**: <https://supabase.com/dashboard/account/tokens> → *Generate new token*. Úsalo
   solo en la terminal (`export SUPABASE_ACCESS_TOKEN=sbp_…`), nunca en archivos.
2. **SMTP propio** (elige uno):
   - Gmail: activa la verificación en dos pasos y crea una *contraseña de aplicación*
     (<https://myaccount.google.com/apppasswords>). Host `smtp.gmail.com`, puerto `465`, usuario = tu Gmail.
   - Resend: requiere un dominio verificado; host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña =
     API key.
3. **Configurar Auth** (todo en una llamada; cambia `<…>`):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/eolsklubeywfmuyrtxla/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "site_url": "https://jalducin.github.io/platform-STALD/",
  "uri_allow_list": "https://jalducin.github.io/platform-STALD/**,http://localhost:8765/**,http://127.0.0.1:8785/**",
  "external_email_enabled": true,
  "disable_signup": false,
  "mailer_otp_length": 6,
  "mailer_otp_exp": 3600,
  "mailer_subjects_magic_link": "Tu enlace para entrar a STALD",
  "mailer_templates_magic_link_content": "<h2>Hola 👋</h2><p>Toca el botón para entrar a la Plataforma STALD:</p><p><a href=\"{{ .ConfirmationURL }}\" style=\"display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700\">Entrar a STALD</a></p><p>Si abres el correo en otro aparato, escribe este código en la página: <b style=\"font-size:20px;letter-spacing:4px\">{{ .Token }}</b></p><p>El enlace dura 1 hora y sirve una sola vez. Si no lo pediste, ignora este correo.</p>",
  "mailer_subjects_confirmation": "Tu enlace para entrar a STALD",
  "mailer_templates_confirmation_content": "<h2>Hola 👋</h2><p>Toca el botón para entrar a la Plataforma STALD:</p><p><a href=\"{{ .ConfirmationURL }}\" style=\"display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700\">Entrar a STALD</a></p><p>Si abres el correo en otro aparato, escribe este código en la página: <b style=\"font-size:20px;letter-spacing:4px\">{{ .Token }}</b></p><p>El enlace dura 1 hora y sirve una sola vez. Si no lo pediste, ignora este correo.</p>",
  "smtp_admin_email": "<correo remitente>",
  "smtp_sender_name": "Plataforma STALD",
  "smtp_host": "<smtp.gmail.com | smtp.resend.com>",
  "smtp_port": "465",
  "smtp_user": "<usuario SMTP>",
  "smtp_pass": "<contraseña de aplicación o API key>",
  "rate_limit_email_sent": 100
}
JSON
```

   Comprobar: `curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
   https://api.supabase.com/v1/projects/eolsklubeywfmuyrtxla/config/auth | jq '{site_url, uri_allow_list,
   mailer_otp_length, smtp_host}'`.
   Equivalente en el panel: *Authentication → URL Configuration* (Site URL y Redirect URLs), *Authentication →
   Emails → Templates* (Magic Link y Confirm signup) y *Authentication → Emails → SMTP Settings*; *Rate Limits*.
4. **Variables de Deno**: ya existen `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_KEY`. No hay
   nada nuevo que activar. Opcionales: `LOGIN_TRANSICION_HASTA` (para alargar la transición) y `SITIO_URL`.
5. **Alta de las personas actuales**: arma un archivo fuera del repo con un correo por línea (alumnos y alumnas de
   Notion/`alumnos.json`, invitados de `GET /juegos/invitados` y tu correo) y corre:

```bash
export SUPABASE_URL=https://eolsklubeywfmuyrtxla.supabase.co
export SUPABASE_SERVICE_KEY=$(supabase projects api-keys --project-ref eolsklubeywfmuyrtxla -o json | jq -r '.[] | select(.name=="service_role") | .api_key')
npx -y deno run -A herramientas/alta-usuarios-auth.ts --correos ~/correos-stald.txt --prueba   # revisar
npx -y deno run -A herramientas/alta-usuarios-auth.ts --correos ~/correos-stald.txt            # dar de alta
```

6. **Verificación en producción** (tareas 5.4 y 5.5): pedir el enlace con tu correo en el portal, entrar, ver Inglés
   (cuando esté integrado) y cerrar sesión; `curl -s "https://stald.jalducin.deno.net/perfil?email=<admin>"` → 401;
   desde el portal, «🔗 Enlace de acceso» para un alumno o alumna de prueba. Después del 2026-10-12:
   `curl -s "https://stald.jalducin.deno.net/perfil?email=<alumna A>"` → 401 `inicia_sesion`.

## Resultado

- Estado Step 5 (5.1–5.3): PASS
- Bloqueos: ninguno. Pendientes externos: configuración de Supabase Auth (1.1), alta de usuarios (1.2), verificación
  en producción (5.4, 5.5) e integración en `ingles.html` (Sprint 2).

## Integración pendiente en `ingles.html` (Sprint 2)

1. Antes del `<script>` principal: `<script src="comun/auth.js?v=1"></script>`.
2. Envolver `fetchJson(url, opts)` y la carga de `/ingles/data` (`loadFor`) con `StaldAuth.fetchConSesion(url, opts)`.
   Con sesión (`StaldAuth.email()`), no agregar `?email=`; sin sesión (transición), sí.
3. Tras cada respuesta: `if (StaldAuth.esSesionVencida(res, body)) { await StaldAuth.salir(); mostrar la entrada }`.
4. Arranque: `await StaldAuth.iniciar(API_BASE)`; correo = `StaldAuth.email() || StaldAuth.correoViejo()`; sin
   correo, `StaldAuth.pintarEntrada(loginEl, { titulo: '📘 Inglés', alEntrar: c => loadFor(c) })`.
5. 🚪 Cerrar sesión (menú 👤 Perfil): `await StaldAuth.salir()` y mostrar la entrada.
6. Sin esto, el admin no puede usar `ingles.html` (su `?email=` recibe 401 desde el día 1); alumnos y alumnas siguen
   entrando hasta el 2026-10-12.
