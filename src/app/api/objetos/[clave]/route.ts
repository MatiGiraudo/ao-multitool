import { servidor } from "@/contenedor/servidor";
import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { ObjetoMapper, type ObjetoDto } from "@/objetos/infraestructura/ObjetoDto";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ clave: string }> };

export function PUT(req: Request, { params }: Ctx) {
  return responder(async () => {
    const { clave } = await params;
    const dto = (await req.json()) as ObjetoDto;
    if (dto.clave !== clave) return Response.json({ error: "La clave de la URL no coincide con la del objeto." }, { status: 400 });
    await servidor.guardarObjeto.ejecutar(ObjetoMapper.aDominio(dto));
    return sinContenido();
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return responder(async () => {
    await servidor.eliminarObjeto.ejecutar((await params).clave);
    return sinContenido();
  });
}
