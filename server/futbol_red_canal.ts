// Doble de pruebas del canal en vivo (misma API que EnVivo.conectar de juegos/en-vivo.js) con reloj controlado por la
// prueba: latencia, pérdida y desorden deterministas por semilla. `entregar()` reparte lo que ya «llegó».
// Solo para server/futbol_red_test.ts (openspec: futbol-en-linea).
// deno-lint-ignore-file no-explicit-any
import "../juegos/futbol-motor.js";

const M = (globalThis as any).FutbolMotor;

interface Opciones { latencia: number; perdida: number; desorden: number; ahora: () => number; semilla: string; ids: string[] }
type Oyente = (datos: any, meta: { de: string; seq: number; t: number; latencia: number }) => void;

export function canalesSimulados(o: Opciones) {
  const rng = M.rngDe(o.semilla, "canal");
  const cola: { para: string; evento: string; datos: any; meta: any; llega: number }[] = [];
  const canales = o.ids.map((id) => {
    const oyentes: Record<string, Oyente[]> = {}, caidas: ((id: string) => void)[] = [];
    const ultimo: Record<string, number> = {}, avisado: Record<string, boolean> = {};
    let seq = 0, cerrado = false;
    const c = {
      enviadas: 0,
      enviar(evento: string, datos: any) {
        if (cerrado) return;
        seq++; c.enviadas++;
        for (const para of o.ids) {
          if (para === id || rng() < o.perdida) continue;
          const extra = rng() < o.desorden ? rng() * Math.max(40, o.latencia) : 0;
          cola.push({ para, evento, datos: JSON.parse(JSON.stringify(datos)), meta: { de: id, seq, t: o.ahora() }, llega: o.ahora() + o.latencia + extra });
        }
      },
      al(evento: string, fn: Oyente) { (oyentes[evento] ||= []).push(fn); },
      presencia: () => o.ids.slice(),
      alCambiarPresencia(_fn: unknown) {},
      latencia: () => o.latencia,
      alDesconectar(fn: (id: string) => void) { caidas.push(fn); },
      cerrar() { cerrado = true; },
      // Entrega los mensajes que ya llegaron a este canal y revisa quién lleva 3 s sin mandar nada.
      entregar() {
        const t = o.ahora();
        for (let k = 0; k < cola.length;) {
          const m = cola[k];
          if (m.para !== id || m.llega > t) { k++; continue; }
          cola.splice(k, 1);
          ultimo[m.meta.de] = t; avisado[m.meta.de] = false;
          for (const fn of oyentes[m.evento] || []) fn(m.datos, { ...m.meta, latencia: t - m.meta.t });
        }
        for (const otro of o.ids) {
          if (otro === id) continue;
          if (ultimo[otro] === undefined) ultimo[otro] = t;
          if (!avisado[otro] && t - ultimo[otro] >= 3000) { avisado[otro] = true; caidas.forEach((fn) => fn(otro)); }
        }
      },
    };
    return c;
  });
  return canales;
}
