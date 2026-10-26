import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { CabezaMapper } from "@/apariencias/infraestructura/AparienciaDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeLaColeccion({
  mapeador: CabezaMapper,
  plural: "cabezas",
  listar: () => servidor.listarCabezas.ejecutar(),
  guardarVarios: (items) => servidor.cabezas.guardarVarios(items),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
