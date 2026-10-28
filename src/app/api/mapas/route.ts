import { responder } from "@/compartido/infraestructura/respuestas";
import { servidor } from "@/contenedor/servidor";

export const dynamic = "force-dynamic";

/** GET /api/mapas → los mapas guardados en el proyecto, sin sus 40.000 celdas. */
export function GET() {
  return responder(async () => Response.json(await servidor.listarMapas.ejecutar()));
}
