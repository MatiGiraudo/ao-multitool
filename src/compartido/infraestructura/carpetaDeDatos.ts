import path from "node:path";
import { promises as fs } from "node:fs";

/**
 * Dónde viven tus datos en disco. Por defecto es la carpeta `data/` del proyecto,
 * pensada para versionarla con git. Se puede cambiar con la variable AO_DATA_DIR.
 * Sólo se usa del lado del servidor.
 */
export function carpetaDeDatos(...partes: string[]): string {
  const base = process.env.AO_DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
  // La carpeta se decide al ejecutar, no al compilar: le pedimos a Turbopack que no intente rastrearla.
  return path.join(/*turbopackIgnore: true*/ base, ...partes);
}

export async function asegurarCarpeta(ruta: string): Promise<void> {
  await fs.mkdir(ruta, { recursive: true });
}

/** Escribe primero a un temporal y después renombra: si algo falla a mitad, no queda un JSON cortado. */
export async function escribirAtomico(ruta: string, contenido: string | Uint8Array): Promise<void> {
  await asegurarCarpeta(path.dirname(ruta));
  const tmp = `${ruta}.${process.pid}.tmp`;
  await fs.writeFile(tmp, contenido);
  await fs.rename(tmp, ruta);
}

export async function leerSiExiste(ruta: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(ruta);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Los ids terminan en nombres de archivo: sólo aceptamos caracteres seguros. */
export function idSeguro(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("Identificador inválido.");
  return id;
}
