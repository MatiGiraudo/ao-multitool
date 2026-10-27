import { servidor } from "@/contenedor/servidor";
import { responder } from "@/compartido/infraestructura/respuestas";
import type { ArchivoExportado } from "@/proyecto/aplicacion/ExportarTodo";

export const dynamic = "force-dynamic";

/** Escribe en `data/exportado/` los archivos que armó el navegador. */
export function POST(req: Request) {
  return responder(async () => {
    const archivos = (await req.json()) as ArchivoExportado[];
    if (!Array.isArray(archivos) || archivos.some((a) => typeof a?.nombreArchivo !== "string" || typeof a?.contenido !== "string"))
      return Response.json({ error: "Se esperaba una lista de archivos con nombre y contenido." }, { status: 400 });
    return Response.json(await servidor.guardarExportacion.ejecutar(archivos));
  });
}
