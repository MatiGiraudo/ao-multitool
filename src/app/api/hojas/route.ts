import { servidor } from "@/contenedor/servidor";
import { responder } from "@/compartido/infraestructura/respuestas";
import { HojaMapper } from "@/graficos/infraestructura/HojaDto";

export const dynamic = "force-dynamic";

/** GET /api/hojas → todas las hojas. Las rutas son un adaptador "de entrada": traducen HTTP a casos de uso. */
export function GET() {
  return responder(async () => Response.json((await servidor.listarHojas.ejecutar()).map(HojaMapper.aDto)));
}
