import { servidor } from "@/contenedor/servidor";
import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { HojaMapper, type HojaDto } from "@/graficos/infraestructura/HojaDto";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return responder(async () => {
    const hoja = await servidor.hojas.obtener((await params).id);
    return hoja ? Response.json(HojaMapper.aDto(hoja)) : Response.json({ error: "No existe esa hoja." }, { status: 404 });
  });
}

/** PUT guarda la hoja entera. Pasar por el mapper valida los datos con las reglas del dominio. */
export function PUT(req: Request, { params }: Ctx) {
  return responder(async () => {
    const { id } = await params;
    const dto = (await req.json()) as HojaDto;
    if (dto.id !== id) return Response.json({ error: "El id de la URL no coincide con el de la hoja." }, { status: 400 });
    await servidor.guardarHoja.ejecutar(HojaMapper.aDominio(dto));
    return sinContenido();
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return responder(async () => {
    await servidor.eliminarHoja.ejecutar((await params).id);
    return sinContenido();
  });
}
