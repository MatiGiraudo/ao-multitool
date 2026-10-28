import { servidor } from "@/contenedor/servidor";
import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import type { VarianteDeImagen } from "@/graficos/aplicacion/puertos";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const variante = (req: Request): VarianteDeImagen => (new URL(req.url).searchParams.get("variante") === "original" ? "original" : "actual");

export function GET(req: Request, { params }: Ctx) {
  return responder(async () => {
    const png = await servidor.imagenes.leer((await params).id, variante(req));
    if (!png) return Response.json({ error: "Esta hoja no tiene imagen." }, { status: 404 });
    // La URL lleva ?v=<versión>: cada versión es inmutable y se puede cachear para siempre.
    return new Response(png, { headers: { "content-type": "image/png", "cache-control": "private, max-age=31536000, immutable" } });
  });
}

export function PUT(req: Request, { params }: Ctx) {
  return responder(async () => {
    const cuerpo = await req.blob();
    if (!cuerpo.size) return Response.json({ error: "La imagen está vacía." }, { status: 400 });
    await servidor.imagenes.guardar((await params).id, cuerpo, variante(req));
    return sinContenido();
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return responder(async () => {
    await servidor.imagenes.eliminar((await params).id);
    return sinContenido();
  });
}
