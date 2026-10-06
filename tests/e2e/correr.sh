#!/usr/bin/env bash
# Orquestador de las pruebas E2E (openspec: pruebas-en-repo). Funciona en Git Bash (Windows) y en Linux.
#
# Uso:  bash tests/e2e/correr.sh --datos <copia del repo privado de datos> [opciones] [prueba ...]
#   --datos <ruta>          carpeta del repo privado de datos (se copia; la original nunca se modifica)
#   --pg                    Inglés contra Postgres de prueba (tablas stald_test_*). Requiere SUPABASE_URL y
#                           SUPABASE_SERVICE_KEY en el entorno (nunca en archivos). Al terminar vacía stald_test_*.
#   --pg-vaciar             con --pg: vacía stald_test_* aunque ya tenga filas (si no, se detiene sin tocarlas)
#   --puerto-api <n>        puerto del servidor Deno (8817)
#   --puerto-web <n>        puerto de los estáticos (8795)
#   --transicion-terminada  el servidor corre con LOGIN_TRANSICION_HASTA=2026-01-01 en todas las fases
#   --lista                 lista las pruebas y su fase, y sale
#   prueba ...              nombres cortos (poker, ingles-pro, ...); sin nombres corre todas
#
# Salidas en tests/e2e/salida/ (ignorada por git): <prueba>.out, capturas, servidor-*.log y resumen.txt.
# Sale con 0 si todas pasan (las OMITIDAS no cuentan como falla) y con 1 si alguna falla; 2 si los argumentos
# o el entorno no son válidos.
set -u

E2E=$(cd "$(dirname "$0")" && pwd)
RAIZ=$(cd "$E2E/../.." && pwd)
SALIDA=$E2E/salida
FIXTURE=$RAIZ/tests/fixtures/rows-fixture.json
PUERTO_API=8817
PUERTO_WEB=8795
DATOS_ORIGEN=""
PG=0
PG_VACIAR=0
TRANSICION=""
TIEMPO_MAX=${TIEMPO_MAX:-600} # segundos por prueba
PEDIDAS=()

# Orden canónico: Inglés (comparten servidor), las que necesitan datos propios, plataforma y juegos, y al final
# la de login con la transición terminada.
ORDEN=(alta-alumnos inicio-lunes segunda-oportunidad pronunciacion profe-grupo ruta-profe profe-diseno examen-secundaria autoguardado
  grupos ingles-pro
  login portal juegos partidas enlace-sala
  conquian-estres clasicos fusion sudoku dragon-run puntos-tipo basta-rondas loteria-sala una-sala una-robo
  poker cartas-espanolas ajedrez ajustes-salas ritmo avatar-foto
  login-despues)

# Fase = cómo se preparan datos y servidor:
#   ingles  copia limpia; con --pg, migrada a stald_test_*
#   grupos  solo --pg; la semana 2026-09-28 se asigna a grupo-1
#   pro     solo --pg; copia y migración limpias
#   base    copia limpia, sin Postgres
#   despues sin Postgres y con LOGIN_TRANSICION_HASTA en el pasado
fase_de() {
  case $1 in
    alta-alumnos | inicio-lunes | segunda-oportunidad | pronunciacion | profe-grupo | ruta-profe | profe-diseno | examen-secundaria | autoguardado) echo ingles ;;
    grupos) echo grupos ;;
    ingles-pro) echo pro ;;
    login-despues) echo despues ;;
    *) echo base ;;
  esac
}
solo_pg() { [ "$1" = grupos ] || [ "$1" = pro ]; }

uso() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; }
error() { echo "ERROR: $*" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case $1 in
    --datos) DATOS_ORIGEN=${2:-}; shift 2 ;;
    --pg) PG=1; shift ;;
    --pg-vaciar) PG_VACIAR=1; shift ;;
    --puerto-api) PUERTO_API=${2:-}; shift 2 ;;
    --puerto-web) PUERTO_WEB=${2:-}; shift 2 ;;
    --transicion-terminada) TRANSICION=2026-01-01; shift ;;
    --lista) for t in "${ORDEN[@]}"; do printf '%-22s %s\n' "$t" "$(fase_de "$t")"; done; exit 0 ;;
    -h | --help) uso; exit 0 ;;
    -*) uso; error "opción desconocida: $1" ;;
    *) n=${1#e2e-}; n=${n%.js}; PEDIDAS+=("$n"); shift ;;
  esac
done

# --- Validaciones (antes de levantar nada) ---
[ -n "$DATOS_ORIGEN" ] || { uso; error "falta --datos <copia del repo privado de datos>"; }
[ -d "$DATOS_ORIGEN" ] || error "no existe la carpeta de datos: $DATOS_ORIGEN"
[ -f "$DATOS_ORIGEN/alumnos.json" ] && [ -d "$DATOS_ORIGEN/contenido" ] || error "$DATOS_ORIGEN no parece el repo de datos (falta alumnos.json o contenido/)"
DATOS_ORIGEN=$(cd "$DATOS_ORIGEN" && pwd)
case $PUERTO_API$PUERTO_WEB in *[!0-9]*) error "los puertos deben ser números" ;; esac
[ "$PUERTO_API" != "$PUERTO_WEB" ] || error "los puertos de API y estáticos deben ser distintos"
for n in ${PEDIDAS[@]+"${PEDIDAS[@]}"}; do
  [ -f "$E2E/e2e-$n.js" ] || error "prueba desconocida: $n. Disponibles: ${ORDEN[*]}"
done
[ -d "$E2E/node_modules/playwright" ] || error "falta Playwright: corre 'npm install' en tests/e2e (y 'npx playwright install chromium' si no tienes CHROME)"
if [ $PG = 1 ]; then
  [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_KEY:-}" ] || error "--pg requiere SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno"
  [ -z "${STALD_TABLAS:-}" ] || [ "$STALD_TABLAS" = stald_test_ ] || error "--pg solo usa STALD_TABLAS=stald_test_ (recibido: $STALD_TABLAS)"
  export STALD_TABLAS=stald_test_
fi
if command -v deno >/dev/null 2>&1; then DENO=(deno); else DENO=(npx -y deno); fi
PY=""
for c in python3 python; do if "$c" -c "import sys" >/dev/null 2>&1; then PY=$c; break; fi; done
[ -n "$PY" ] || error "falta Python 3 (sirve los estáticos con http.server)"
command -v curl >/dev/null 2>&1 || error "falta curl"

# Rutas nativas para Deno y Python en Windows (C:/...); en Linux quedan igual.
nativo() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi; }

escucha() { # ¿hay algo escuchando en el puerto $1?
  if command -v netstat >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
    netstat -ano | grep -E "[:.]$1 +[^ ]+ +LISTENING" >/dev/null
  else
    curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/"
  fi
}
for p in "$PUERTO_API" "$PUERTO_WEB"; do escucha "$p" && error "el puerto $p ya está ocupado; elige otro con --puerto-api/--puerto-web"; done

API=http://127.0.0.1:$PUERTO_API
BASE=http://127.0.0.1:$PUERTO_WEB
mkdir -p "$SALIDA"
TMP_BASE=$(mktemp -d "${TMPDIR:-/tmp}/stald-e2e.XXXXXX")
COPIA=$TMP_BASE/datos
PIDS=()

# --- Servidores ---
matar_puerto() {
  local pid
  if command -v taskkill >/dev/null 2>&1; then
    for pid in $(netstat -ano | grep -E "[:.]$1 +[^ ]+ +LISTENING" | awk '{print $5}' | sort -u); do
      taskkill //F //T //PID "$pid" >/dev/null 2>&1
    done
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$1/tcp" >/dev/null 2>&1
  elif command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null); [ -z "$pid" ] || kill $pid 2>/dev/null
  fi
}
apagar() {
  local p
  for p in ${PIDS[@]+"${PIDS[@]}"}; do kill "$p" 2>/dev/null; done
  PIDS=()
  matar_puerto "$PUERTO_API"; matar_puerto "$PUERTO_WEB"
  for _ in 1 2 3 4 5 6 7 8 9 10; do escucha "$PUERTO_API" || escucha "$PUERTO_WEB" || return 0; sleep 1; done
  echo "AVISO: algún puerto sigue ocupado tras apagar" >&2
}
esperar() { # $1 = URL, $2 = nombre
  local i
  for i in $(seq 1 120); do curl -s -o /dev/null --max-time 2 "$1" && return 0; sleep 1; done
  echo "ERROR: $2 no respondió en 120 s ($1)" >&2; return 1
}
levantar() { # $1 = fase
  local fase=$1 hasta=$TRANSICION supa_url="" supa_key=""
  [ "$fase" = despues ] && hasta=2026-01-01
  if [ $PG = 1 ] && { [ "$fase" = ingles ] || solo_pg "$fase"; }; then supa_url=$SUPABASE_URL; supa_key=$SUPABASE_SERVICE_KEY; fi
  (cd "$RAIZ" && exec env DATA_DIR="$(nativo "$COPIA")" ROWS_FIXTURE="$(nativo "$FIXTURE")" \
    SUPER_ADMIN_EMAIL=admin@example.com PERMITIR_HOY=1 PORT="$PUERTO_API" \
    SUPABASE_URL="$supa_url" SUPABASE_SERVICE_KEY="$supa_key" SUPABASE_PUBLISHABLE_KEY= \
    STALD_TABLAS=stald_test_ LOGIN_TRANSICION_HASTA="$hasta" NOTION_TOKEN= GITHUB_TOKEN= \
    "${DENO[@]}" run -A server/main.ts) > "$SALIDA/servidor-$fase.log" 2>&1 &
  PIDS+=($!)
  "$PY" -m http.server "$PUERTO_WEB" --bind 127.0.0.1 --directory "$(nativo "$RAIZ")" > "$SALIDA/estaticos.log" 2>&1 &
  PIDS+=($!)
  esperar "$API/salud" "el servidor" && esperar "$BASE/index.html" "los estáticos"
}

# --- Postgres de prueba (solo stald_test_*) ---
pg() { # $1 = método, $2 = ruta REST, $3 = cuerpo opcional
  curl -s -X "$1" "${SUPABASE_URL%/}/rest/v1/$2" -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -H "Content-Type: application/json" ${3:+-d "$3"}
}
limpiar_pg() {
  pg DELETE "stald_test_inscripciones?alumno=neq.__" >/dev/null
  pg DELETE "stald_test_grupos?id=neq.__" >/dev/null
  pg DELETE "stald_test_docs?path=neq.__" >/dev/null
}
filas_pg() { # cuántas filas quedan en stald_test_* (máx. 1 por tabla)
  local t c total=0
  for t in docs:path grupos:id inscripciones:alumno; do
    c=$(pg GET "stald_test_${t%%:*}?select=${t##*:}&limit=1" | grep -o '{' | wc -l)
    total=$((total + c))
  done
  echo $total
}

# --- Datos ---
preparar() { # $1 = fase
  rm -rf "$COPIA" && mkdir -p "$COPIA" && cp -r "$DATOS_ORIGEN/." "$COPIA/" && rm -rf "$COPIA/.git"
  # Contenido de prueba del repo (tests/fixtures/datos, solo datos de ejemplo): se superpone antes de arrancar el
  # servidor, que carga la copia en memoria una sola vez (MemoryStore.fromDir).
  cp -r "$RAIZ/tests/fixtures/datos/." "$COPIA/"
  # Las pruebas parten de cero: sin resultados del profe ni del examen del viernes 2026-10-02.
  [ -d "$COPIA/resultados" ] && find "$COPIA/resultados" -name profe.json -delete
  rm -f "$COPIA"/resultados/examen-2026-10-02/*.json
  if [ "$1" = grupos ]; then
    "$PY" - "$(nativo "$COPIA")/contenido/semanas/2026-09-28.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p, encoding="utf-8"))
d["grupos"] = ["grupo-1"]
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
PY
  fi
  if [ $PG = 1 ] && { [ "$1" = ingles ] || solo_pg "$1"; }; then
    limpiar_pg
    (cd "$RAIZ" && "${DENO[@]}" run -A herramientas/migrar-ingles.ts --datos "$(nativo "$COPIA")") > "$SALIDA/migracion-$1.log" 2>&1 ||
      { echo "ERROR: falló la migración a stald_test_* (ver salida/migracion-$1.log)" >&2; return 1; }
    pg POST stald_test_grupos '{"id":"grupo-1","nombre":"Grupo 1","orden":0}' >/dev/null
  fi
}

# stald_test_* es compartida: si ya tiene filas, otra corrida podría estar usándola. No se toca sin --pg-vaciar.
if [ $PG = 1 ] && [ $PG_VACIAR = 0 ] && [ "$(filas_pg)" != 0 ]; then
  rm -rf "$TMP_BASE"
  error "stald_test_* ya tiene filas (¿otra corrida en curso?). Si son restos de una corrida cortada, repite con --pg-vaciar"
fi

cerrar() {
  apagar
  if [ $PG = 1 ]; then
    limpiar_pg
    echo "stald_test_* al terminar: $(filas_pg) filas" | tee -a "$SALIDA/resumen.txt"
  fi
  rm -rf "$TMP_BASE"
}
trap cerrar EXIT
trap 'exit 130' INT TERM

# --- Corrida ---
correr() { # $1 = prueba
  local n=$1 out=$SALIDA/$1.out rc p f estado
  (cd "$E2E" && BASE=$BASE API=$API DATA="$(nativo "$COPIA")" SALIDA="$(nativo "$SALIDA")" \
    timeout "$TIEMPO_MAX" node "e2e-$n.js") > "$out" 2>&1
  rc=$?
  p=$(grep -c '^PASS' "$out"); f=$(grep -cE '^FAIL|ERROR' "$out")
  if [ $rc = 0 ] && [ "$f" = 0 ]; then estado=PASS; else estado=FAIL; FALLAS=$((FALLAS + 1)); fi
  printf '%-5s %-22s pasos PASS=%-3s FAIL=%-3s salida=%s\n' "$estado" "$n" "$p" "$f" "$rc" | tee -a "$SALIDA/resumen.txt"
  [ $estado = PASS ] || grep -E '^FAIL|ERROR' "$out" | cut -c1-220 | sed 's/^/        /' | tee -a "$SALIDA/resumen.txt"
}

SELECCION=()
for t in "${ORDEN[@]}"; do
  if [ ${#PEDIDAS[@]} = 0 ]; then SELECCION+=("$t"); else
    for n in "${PEDIDAS[@]}"; do [ "$n" = "$t" ] && SELECCION+=("$t"); done
  fi
done

: > "$SALIDA/resumen.txt"
echo "== E2E $(date '+%Y-%m-%d %H:%M') · API $API · estáticos $BASE · Postgres de prueba: $([ $PG = 1 ] && echo sí || echo no)" | tee -a "$SALIDA/resumen.txt"
FALLAS=0; OMITIDAS=0; TOTAL=0; ACTUAL=""
for t in "${SELECCION[@]}"; do
  fase=$(fase_de "$t")
  if solo_pg "$fase" && [ $PG = 0 ]; then
    printf '%-5s %-22s requiere --pg (Postgres de prueba)\n' OMIT "$t" | tee -a "$SALIDA/resumen.txt"
    OMITIDAS=$((OMITIDAS + 1)); continue
  fi
  if [ "$fase" != "$ACTUAL" ] || solo_pg "$fase"; then
    apagar
    echo "-- fase $fase" | tee -a "$SALIDA/resumen.txt"
    preparar "$fase" && levantar "$fase" || { echo "ERROR: no se pudo preparar la fase $fase" | tee -a "$SALIDA/resumen.txt"; exit 1; }
    ACTUAL=$fase
  fi
  TOTAL=$((TOTAL + 1))
  correr "$t"
done
echo "== Total: $TOTAL corridas, $((TOTAL - FALLAS)) PASS, $FALLAS FAIL, $OMITIDAS omitidas" | tee -a "$SALIDA/resumen.txt"
[ $FALLAS = 0 ]
