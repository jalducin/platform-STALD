// Universo ficticio de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar).
// Genera juegos/datos/futbol.json con las reglas de juegos/futbol-liga.js (semilla fija, sin Math.random): 3 ligas de
// 8 clubes, la Copa Continental de Clubes y 16 jugadores y jugadoras por club con nombres inventados.
// Uso: npx -y deno run -A herramientas/generar-futbol.ts   (sobrescribe el JSON; server/futbol_liga_test.ts comprueba
// que el archivo versionado sea idéntico a lo que genera este script).
// deno-lint-ignore-file no-explicit-any
import "../juegos/futbol-motor.js";
import "../juegos/futbol-liga.js";

export function generarUniverso(): any {
  return (globalThis as any).FutbolLiga.generarUniverso();
}

if (import.meta.main) {
  const destino = new URL("../juegos/datos/futbol.json", import.meta.url);
  const texto = JSON.stringify(generarUniverso()) + "\n";
  Deno.writeTextFileSync(destino, texto);
  console.log(`juegos/datos/futbol.json: ${texto.length} bytes`);
}
