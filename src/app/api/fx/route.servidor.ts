import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { EfectoMapper } from "@/fx/infraestructura/EfectoDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeLaColeccion({
  mapeador: EfectoMapper,
  plural: "efectos",
  listar: () => servidor.listarEfectos.ejecutar(),
  guardarVarios: (efectos) => servidor.efectos.guardarVarios(efectos),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
