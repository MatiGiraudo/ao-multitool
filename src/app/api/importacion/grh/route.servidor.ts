import { servidor } from "@/contenedor/servidor";
import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { TablaDeGrhMapper, type TablaDeGrhDto } from "@/importacion/infraestructura/TablaDeGrhDto";

export const dynamic = "force-dynamic";

/** La tabla de GRH es un documento único, no una colección: alcanza con leerla y guardarla. */
export function GET() {
  return responder(async () => {
    const tabla = await servidor.tablaDeGrh.leer();
    return Response.json(tabla ? TablaDeGrhMapper.aDto(tabla) : null);
  });
}

export function PUT(req: Request) {
  return responder(async () => {
    const tabla = TablaDeGrhMapper.aDominio((await req.json()) as TablaDeGrhDto);
    if (!tabla) return Response.json({ error: "El cuerpo no es una tabla de GRH válida." }, { status: 400 });
    await servidor.tablaDeGrh.guardar(tabla);
    return sinContenido();
  });
}
