// «🦎 Brigada Xalli» en el servidor (openspec: brigada-xalli, design.md §10). Las reglas (forma del avance, puntos
// máximos de cada misión y puntos de ranking) viven en juegos/brigada-motor.js, el mismo archivo que usa la página: el
// servidor lo importa (como server/arena.ts importa juegos/arena-motor.js). Aquí solo va lo del servidor.
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";

export const JUEGO_BRIGADA = "brigada";

const BM = (globalThis as unknown as {
  BrigadaMotor: {
    validarProgreso(datos: unknown): boolean;
    puntosMaximos(mision: number, n: number): number;
    puntosRanking(puntos: number): number;
  };
}).BrigadaMotor;

// PUT /juegos/progreso/brigada: forma exacta y versionada ({ ver: 1, desbloqueada, personaje, misiones, companeros,
// totales }), sin misiones por encima de la desbloqueada y con récords posibles.
export const validarProgresoBrigada = (datos: unknown) => BM.validarProgreso(datos);
export const puntosMaximosBrigada = (mision: number, n: number) => BM.puntosMaximos(mision, n);
export const puntosRankingBrigada = (puntos: number) => BM.puntosRanking(puntos);
