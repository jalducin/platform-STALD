## Context

La Admin API de Supabase (`PUT /auth/v1/admin/users/<id>`) acepta `email_confirm: true`. `crear` ya lo manda;
`actualizar` no.

## Decisions

- **Dónde va `email_confirm: true`:** en `actualizar` solo cuando lo llama `/auth/preparar`. No se manda en
  `/auth/contrasena` ni en `/auth/restablecer`.
- **Por qué es suficiente:** quien no tiene el correo confirmado y restablece, entra después por
  `/auth/preparar`, y ahí se confirma.
