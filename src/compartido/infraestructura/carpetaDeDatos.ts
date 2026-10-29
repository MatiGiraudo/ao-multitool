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

/**
 * Los primeros bytes de un archivo, sin traerse el resto.
 *
 * Es lo que deja listar los mapas sin leer sus 40.000 celdas. Si el corte parte un carácter
 * multibyte no molesta: lo que se busca en esos bytes termina bastante antes del final.
 */
export async function leerCabecera(ruta: string, bytes: number): Promise<string | null> {
  const archivo = await fs.open(ruta, "r").catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (!archivo) return null;
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await archivo.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await archivo.close();
  }
}

// Los dos nombres seguros viven aparte porque los usa también el modo carpeta, en el navegador.
export { idSeguro, nombreSeguroDeArchivo } from "./nombresSeguros";
