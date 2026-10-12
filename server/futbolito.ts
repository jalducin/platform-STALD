// Futbolito por equipos en sala (openspec: futbolito-equipos-controles, design.md §4).
// El servidor no simula la física, pero conoce la mesa: formato (1v1 | 2v2), personas por orden de entrada con su
// preferencia de equipo y bots. Con eso reparte asientos igual que la página (`Futbolito.repartir` en
// juegos/futbolito-motor.js; server/futbolito_equipos_test.ts comprueba que sean iguales) y valida que cada tiro use una
// barra del asiento de quien lo manda.

export const FORMATOS = ["1v1", "2v2"] as const;
export type Equipo = 0 | 1;
export type Rol = "todas" | "adelante" | "atras";
// Barras de cada equipo por rol (índices de Futbolito.BARRAS, de arriba abajo). «adelante» = medios + delanteros;
// «atras» = portero + defensa. Igual que BARRAS_ROL en juegos/futbolito-motor.js.
export const BARRAS_ROL: Record<number, Record<Rol, number[]>> = {
  0: { adelante: [2, 4], atras: [6, 7], todas: [2, 4, 6, 7] },
  1: { adelante: [3, 5], atras: [0, 1], todas: [0, 1, 3, 5] },
};
export interface Asiento { id: string; bot?: boolean; equipo?: number }
export interface Lugar { eq: Equipo; rol: Rol; barras: number[] }

// Reparto de asientos (personas por orden de entrada y luego bots), cupo ⌈asientos/2⌉ por equipo:
//   1. las personas con preferencia, a su equipo si cabe;
//   2. las demás personas, alternadas por orden de entrada (la k-ésima persona al equipo k % 2; si está lleno, al otro);
//   3. los bots, al equipo con menos integrantes (empate: 0).
// En cada equipo, por orden de asiento: con uno maneja todas; con dos, el primero adelante y el segundo atrás.
export function repartir(asientos: Asiento[]): Lugar[] {
  const cupo = Math.ceil(asientos.length / 2), cuenta = [0, 0];
  const eq: (Equipo | undefined)[] = asientos.map(() => undefined);
  asientos.forEach((a, i) => {
    if (a.bot || (a.equipo !== 0 && a.equipo !== 1)) return;
    if (cuenta[a.equipo] < cupo) { eq[i] = a.equipo; cuenta[a.equipo]++; }
  });
  asientos.forEach((a, i) => {
    if (a.bot || eq[i] !== undefined) return;
    let e: Equipo = i % 2 === 0 ? 0 : 1;
    if (cuenta[e] >= cupo) e = e === 0 ? 1 : 0;
    eq[i] = e; cuenta[e]++;
  });
  asientos.forEach((_, i) => {
    if (eq[i] !== undefined) return;
    const e: Equipo = cuenta[0] <= cuenta[1] ? 0 : 1;
    eq[i] = e; cuenta[e]++;
  });
  return asientos.map((_, i) => {
    const e = eq[i]!, miembros = asientos.map((_, k) => k).filter((k) => eq[k] === e);
    // Solo en su equipo juega todas las barras; en pareja, el primer asiento va adelante y el otro atrás.
    let rol: Rol = "todas";
    if (miembros.length !== 1) rol = miembros.indexOf(i) === 0 ? "adelante" : "atras";
    return { eq: e, rol, barras: BARRAS_ROL[e][rol].slice() };
  });
}

// Formato de la sala al crearla: "1v1" por omisión.
export function formatoDe(op: Record<string, unknown>): string | null {
  if (op.formato === undefined || op.formato === null || op.formato === "") return "1v1";
  return (FORMATOS as readonly string[]).includes(String(op.formato)) ? String(op.formato) : null;
}

interface MesaF { max: number; asientos?: number }
interface JugadorF { id: string; equipo?: number }
// Asientos de la mesa: personas (por `unido`, hasta el cupo) y bots que completan si la sala lleva bots.
export function asientosDe(jugadores: JugadorF[], mesa: MesaF, conBots: boolean): Asiento[] {
  const personas = jugadores.slice(0, mesa.max).map((j) => ({ id: j.id, ...(j.equipo === 0 || j.equipo === 1 ? { equipo: j.equipo } : {}) }));
  const bots = conBots && mesa.asientos ? Math.max(0, mesa.asientos - personas.length) : 0;
  return [...personas, ...Array.from({ length: bots }, (_, k) => ({ id: "bot" + k, bot: true }))];
}

type Error = { error: string; status: number };
// Preferencia de equipo (POST unirse { equipo }): solo Futbolito 2v2 y antes de empezar. Hasta 2 personas por equipo.
export function validarEquipo(formato: string | undefined, iniciada: boolean, jugadores: JugadorF[], yo: string, equipo: unknown): Error | Equipo {
  if (equipo !== 0 && equipo !== 1) return { error: "equipo_invalido", status: 400 };
  if (formato !== "2v2") return { error: "sin_equipos", status: 409 };
  if (iniciada) return { error: "ya_empezo", status: 409 };
  if (jugadores.filter((j) => j.id !== yo && j.equipo === equipo).length >= 2) return { error: "equipo_lleno", status: 409 };
  return equipo;
}

// Tiro de Futbolito: en 2v2 la barra es obligatoria; si viene, debe ser del asiento de quien tira. Rendirse no lleva
// barra. Devuelve null si vale.
export function validarTiro(formato: string | undefined, asientos: Asiento[], yo: string, jugada: { accion: string; barra?: number }): Error | null {
  const i = asientos.findIndex((a) => !a.bot && a.id === yo);
  if (i < 0) return { error: "no_en_mesa", status: 403 };
  if (jugada.accion !== "tiro") return null;
  if (jugada.barra === undefined) return formato === "2v2" ? { error: "jugada_invalida", status: 400 } : null;
  return repartir(asientos)[i].barras.includes(jugada.barra) ? null : { error: "no_es_tu_barra", status: 409 };
}
