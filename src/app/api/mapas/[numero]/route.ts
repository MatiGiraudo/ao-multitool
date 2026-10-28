import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { servidor } from "@/contenedor/servidor";
import { MapaMapper, type MapaDto } from "@/mapas/infraestructura/MapaDto";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ numero: string }> };

const numeroDe = (crudo: string): number => Number(crudo);

export function GET(_req: Request, { params }: Ctx) {
  return responder(async () => {
    const guardado = await servidor.mapas.obtener(numeroDe((await params).numero));
    return guardado ? Response.json(MapaMapper.aDto(guardado)) : Response.json({ error: "No hay un mapa guardado con ese número." }, { status: 404 });
  });
}

/** PUT guarda el mapa entero. Pasar por el mapper lo valida con las reglas del dominio. */
export function PUT(req: Request, { params }: Ctx) {
  return responder(async () => {
    const numero = numeroDe((await params).numero);
    const dto = (await req.json()) as MapaDto;
    if (dto.numero !== numero) return Response.json({ error: "El número de la URL no coincide con el del mapa." }, { status: 400 });
    await servidor.guardarMapa.ejecutar(MapaMapper.aDominio(dto));
    return sinContenido();
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return responder(async () => {
    await servidor.eliminarMapa.ejecutar(numeroDe((await params).numero));
    return sinContenido();
  });
}
