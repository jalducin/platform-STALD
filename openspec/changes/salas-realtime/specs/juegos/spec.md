## ADDED Requirements

### Requirement: Partidas en tiempo real con Supabase Realtime
Cuando hay configuración de Supabase, cada sala SHALL tener un canal secreto. El servidor SHALL publicar el estado de la
sala en ese canal tras cada cambio, y las páginas de los jugadores SHALL recibirlo sin consultar periódicamente; solo
harán una consulta de respaldo cada 30 s. Si el canal falla, la página SHALL volver al sondeo normal. Sin configuración,
todo SHALL funcionar como antes.

#### Scenario: Ver un cambio al instante sin sondear
- **WHEN** Angel responde una pregunta en la sala de Sofy
- **THEN** la página de Sofy recibe el nuevo estado por Realtime, sin haber consultado al servidor

#### Scenario: Canal privado de la sala
- **WHEN** alguien que no está en la sala intenta obtener su canal
- **THEN** el servidor no se lo da (403), y el canal no se puede adivinar

#### Scenario: Avisos fuera de orden
- **WHEN** dos jugadores escriben casi al mismo tiempo y el aviso más viejo llega después del nuevo
- **THEN** la página conserva la versión más nueva de cada jugador (contador `v`) y no regresa una sala ya empezada

#### Scenario: Realtime caído
- **WHEN** la conexión con Realtime falla
- **THEN** la página vuelve a consultar cada 2.5–5 s y la partida sigue

#### Scenario: Sin configuración
- **WHEN** el servidor no tiene las variables de Supabase
- **THEN** no se entrega `rt` y las salas funcionan con sondeo, como hoy
