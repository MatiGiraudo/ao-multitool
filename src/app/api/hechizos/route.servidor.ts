import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { HechizoMapper } from "@/hechizos/infraestructura/HechizoDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeLaColeccion({
  mapeador: HechizoMapper,
  plural: "hechizos",
  listar: () => servidor.listarHechizos.ejecutar(),
  guardarVarios: (hechizos) => servidor.hechizos.guardarVarios(hechizos),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
