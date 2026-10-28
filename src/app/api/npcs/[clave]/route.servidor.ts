import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { NpcMapper } from "@/npcs/infraestructura/NpcDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: NpcMapper,
  guardar: (npc) => servidor.guardarNpc.ejecutar(npc),
  eliminar: (clave) => servidor.eliminarNpc.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
