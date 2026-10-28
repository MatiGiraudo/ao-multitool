import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { CuerpoMapper } from "@/apariencias/infraestructura/AparienciaDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: CuerpoMapper,
  guardar: (item) => servidor.guardarCuerpo.ejecutar(item),
  eliminar: (clave) => servidor.eliminarCuerpo.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
