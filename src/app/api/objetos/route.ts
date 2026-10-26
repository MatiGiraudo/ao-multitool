import { servidor } from "@/contenedor/servidor";
import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { ObjetoMapper, type ObjetoDto } from "@/objetos/infraestructura/ObjetoDto";

export const dynamic = "force-dynamic";

export function GET() {
  return responder(async () => Response.json((await servidor.listarObjetos.ejecutar()).map(ObjetoMapper.aDto)));
}

/** POST guarda varios objetos de una vez (lo usa la importación). */
export function POST(req: Request) {
  return responder(async () => {
    const dtos = (await req.json()) as ObjetoDto[];
    if (!Array.isArray(dtos)) return Response.json({ error: "Se esperaba una lista de objetos." }, { status: 400 });
    await servidor.objetos.guardarVarios(dtos.map(ObjetoMapper.aDominio));
    return sinContenido();
  });
}
