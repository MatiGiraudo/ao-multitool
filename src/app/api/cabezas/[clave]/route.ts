import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { CabezaMapper } from "@/apariencias/infraestructura/AparienciaDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: CabezaMapper,
  guardar: (item) => servidor.guardarCabeza.ejecutar(item),
  eliminar: (clave) => servidor.eliminarCabeza.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
