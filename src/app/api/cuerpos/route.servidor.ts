import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { CuerpoMapper } from "@/apariencias/infraestructura/AparienciaDto";

export const dynamic = "force-dynamic";

const rutas = rutasDeLaColeccion({
  mapeador: CuerpoMapper,
  plural: "cuerpos",
  listar: () => servidor.listarCuerpos.ejecutar(),
  guardarVarios: (items) => servidor.cuerpos.guardarVarios(items),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
