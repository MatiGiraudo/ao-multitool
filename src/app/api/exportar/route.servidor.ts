import { servidor } from "@/contenedor/servidor";
import { responder } from "@/compartido/infraestructura/respuestas";
import { ArchivoExportadoMapper } from "@/proyecto/infraestructura/ArchivoExportadoDto";

export const dynamic = "force-dynamic";

/** Escribe en `data/exportado/` los archivos que armó el navegador. */
export function POST(req: Request) {
  return responder(async () => {
    const crudos = (await req.json()) as unknown;
    if (!Array.isArray(crudos) || !crudos.every(ArchivoExportadoMapper.esValido))
      return Response.json({ error: "Se esperaba una lista de archivos con nombre y contenido." }, { status: 400 });
    const archivos = crudos.map(ArchivoExportadoMapper.aDominio);
    return Response.json(await servidor.guardarExportacion.ejecutar(archivos));
  });
}
