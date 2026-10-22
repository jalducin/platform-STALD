// Datos inline de misiones para pruebas (no es un archivo de pruebas). Personas y contenido inventados.
// deno-lint-ignore-file no-explicit-any
import "../comun/gamificacion.js";

const G = (globalThis as any).Gamificacion;

export const criterio = (id: string, maximo = 25) => ({
  id, criterio: "Criterio " + id, descripcion: "Qué se revisa en " + id, puntos: maximo,
  niveles: [
    { nivel: 4, nombre: "Lo domino", puntos: maximo, descriptor: "Todo bien." },
    { nivel: 3, nombre: "Casi lo logro", puntos: Math.round(maximo * 0.8), descriptor: "Casi." },
    { nivel: 2, nombre: "Voy avanzando", puntos: Math.round(maximo * 0.6), descriptor: "Más o menos." },
    { nivel: 1, nombre: "Estoy empezando", puntos: Math.round(maximo * 0.4), descriptor: "Empezando." },
  ],
});

// Misión válida de Matemáticas en el Valle de los Números (26 oct – 22 nov 2026), 4 pasos y rúbrica 4 × 25.
export function misionValida(extra: Record<string, unknown> = {}): Record<string, any> {
  const paso = (n: number, fecha: string) => ({ id: "p" + n, titulo: "Paso " + n, instrucciones: "Haz el paso " + n + ".", entregable: "Texto", fechaLimite: fecha, tipoEntrega: "texto" });
  return {
    id: "mis-mate-valle-de-los-numeros", tipo: "mision", titulo: "🏪 Misión de prueba", materia: "Matemáticas", mundo: "valle-de-los-numeros",
    disponibleDesde: "2026-11-02",
    consigna: "Planea una venta inventada.\n\n🔒 Sin nombres reales, direcciones ni datos de contacto.",
    pasos: [paso(1, "2026-11-05"), paso(2, "2026-11-10"), paso(3, "2026-11-15"), paso(4, "2026-11-20")],
    rubrica: [criterio("c1"), criterio("c2"), criterio("c3"), criterio("c4")],
    teoria: [{ titulo: "Repaso", texto: "Porcentajes.", practica: [{ id: "q1", pregunta: "¿10 % de 50?", opciones: ["5", "10"], correcta: 0, pista: "Divide entre 10." }] }],
    tips: [{ tipo: "video", texto: "Video", url: "https://www.youtube.com/watch?v=abcdefghijk" }],
    ...extra,
  };
}

export const mundosValidos = () => ({ mundos: G.catalogoDeMundos().map((w: any) => ({ id: w.id, materia: w.materia, nombre: w.nombre, emoji: w.emoji, desde: w.desde, hasta: w.hasta })) });
