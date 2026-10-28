import { responder, sinContenido } from "@/compartido/infraestructura/respuestas";
import { servidor } from "@/contenedor/servidor";
import type { FamiliaClasica, OriginalesDeFamilia } from "@/importacion/dominio/OriginalesRepositorio";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ familia: string }> };

const FAMILIAS: FamiliaClasica[] = ["obj", "npcs", "hechizos", "fxs", "cuerpos", "cabezas"];

const familiaDe = (crudo: string): FamiliaClasica | null => FAMILIAS.find((f) => f === crudo) ?? null;

/** El texto original de cada entrada del archivo del clásico, para poder devolverlo completo. */
export function GET(_req: Request, { params }: Ctx) {
  return responder(async () => {
    const familia = familiaDe((await params).familia);
    if (!familia) return Response.json({ error: "Esa familia no existe." }, { status: 404 });
    return Response.json(await servidor.originales.leer(familia));
  });
}

export function PUT(req: Request, { params }: Ctx) {
  return responder(async () => {
    const familia = familiaDe((await params).familia);
    if (!familia) return Response.json({ error: "Esa familia no existe." }, { status: 404 });
    const entradas = (await req.json()) as OriginalesDeFamilia;
    if (!entradas || typeof entradas !== "object" || Array.isArray(entradas)) {
      return Response.json({ error: "Se esperaba un objeto de entradas por número." }, { status: 400 });
    }
    await servidor.originales.guardar(familia, entradas);
    return sinContenido();
  });
}
