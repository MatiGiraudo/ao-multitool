import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { EfectoMapper } from "@/fx/infraestructura/EfectoDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: EfectoMapper,
  guardar: (efecto) => servidor.guardarEfecto.ejecutar(efecto),
  eliminar: (clave) => servidor.eliminarEfecto.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
