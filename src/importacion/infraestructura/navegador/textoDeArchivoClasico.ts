/**
 * Lee un .dat o .ini del AO clásico como texto.
 *
 * Ojo con la codificación: estos archivos son de Windows y están en ANSI (windows-1252), no en
 * UTF-8. Si se leyeran como UTF-8, "Poción roja" llegaría roto. Así que se intenta UTF-8 en modo
 * estricto —por si el archivo ya fue convertido— y, si no es válido, se vuelve a decodificar como
 * windows-1252, que es lo que de verdad son.
 */
export async function textoDeArchivoClasico(archivo: Blob): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
