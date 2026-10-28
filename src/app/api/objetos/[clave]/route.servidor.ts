import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { ObjetoMapper } from "@/objetos/infraestructura/ObjetoDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: ObjetoMapper,
  guardar: (objeto) => servidor.guardarObjeto.ejecutar(objeto),
  eliminar: (clave) => servidor.eliminarObjeto.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
