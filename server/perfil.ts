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
  invitado: boolean; // invitado registrado en Juegos (solo accede a Juegos)
  accesos: { ingles: boolean; secundaria: boolean; juegos: boolean };
}

export function armarPerfil(email: string, admin: string, ingles: FilaConUsuarios[], secundaria: FilaConUsuarios[], invitados: Record<string, { nombre: string }> = {}): Perfil {
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
  const inv = conocido ? undefined : invitados[email];
  if (inv) return { email, isAdmin: false, nombre: inv.nombre, conocido: true, invitado: true, accesos: { ingles: false, secundaria: false, juegos: true } };
  return { email, isAdmin, nombre, conocido, invitado: false, accesos: { ingles: accIngles, secundaria: accSec, juegos: conocido } };
}
