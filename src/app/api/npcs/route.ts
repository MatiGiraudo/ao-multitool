import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { NpcMapper } from "@/npcs/infraestructura/NpcDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeLaColeccion({
  mapeador: NpcMapper,
  plural: "NPCs",
  listar: () => servidor.listarNpcs.ejecutar(),
  guardarVarios: (npcs) => servidor.npcs.guardarVarios(npcs),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
