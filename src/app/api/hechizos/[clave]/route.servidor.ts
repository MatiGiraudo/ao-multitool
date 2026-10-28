import { servidor } from "@/contenedor/servidor";
import { rutasDeUnItem } from "@/compartido/infraestructura/rutasDeColeccion";
import { HechizoMapper } from "@/hechizos/infraestructura/HechizoDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeUnItem({
  mapeador: HechizoMapper,
  guardar: (hechizo) => servidor.guardarHechizo.ejecutar(hechizo),
  eliminar: (clave) => servidor.eliminarHechizo.ejecutar(clave),
});

export const PUT = rutas.PUT;
export const DELETE = rutas.DELETE;
