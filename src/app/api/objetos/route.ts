import { servidor } from "@/contenedor/servidor";
import { rutasDeLaColeccion } from "@/compartido/infraestructura/rutasDeColeccion";
import { ObjetoMapper } from "@/objetos/infraestructura/ObjetoDto";

export const dynamic = "force-dynamic";

/* Las rutas son un adaptador "de entrada": traducen HTTP a casos de uso y nada más. */
const rutas = rutasDeLaColeccion({
  mapeador: ObjetoMapper,
  plural: "objetos",
  listar: () => servidor.listarObjetos.ejecutar(),
  guardarVarios: (objetos) => servidor.objetos.guardarVarios(objetos),
});

export const GET = rutas.GET;
export const POST = rutas.POST;
