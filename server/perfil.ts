// Perfil de acceso para el portal: a qué espacios entra un correo y cómo saludarlo.
// Mismas reglas que /data e /ingles/data; nunca devuelve filas ni correos de otras personas.

interface FilaConUsuarios {
  userEmails: string[];
  userNames: string[];
  alumno?: string | null;
}

export interface Perfil {
  email: string;
  isAdmin: boolean;
  nombre: string | null;
  conocido: boolean;
  accesos: { ingles: boolean; secundaria: boolean; juegos: boolean };
}

export function armarPerfil(email: string, admin: string, ingles: FilaConUsuarios[], secundaria: FilaConUsuarios[]): Perfil {
  const isAdmin = admin !== "" && email === admin;
  const suyasIngles = ingles.filter((r) => r.userEmails.includes(email));
  const suyasSec = secundaria.filter((r) => r.userEmails.includes(email));
  const accIngles = isAdmin || suyasIngles.length > 0;
  const accSec = isAdmin || suyasSec.length > 0;
  const conocido = accIngles || accSec;
  // Nombre: "Nombre" de Inglés; si no, el primer nombre de Notion en Secundaria.
  const nombre = isAdmin
    ? "Profe"
    : suyasIngles.find((r) => r.alumno)?.alumno ??
      (suyasSec.flatMap((r) => r.userNames)[0]?.trim().split(/\s+/)[0] || null);
  return { email, isAdmin, nombre, conocido, accesos: { ingles: accIngles, secundaria: accSec, juegos: conocido } };
}
