import "server-only";
import { GuardarHoja, ListarHojas, EliminarHoja } from "@/graficos/aplicacion/casosDeUso";
import { ArchivosAlmacenDeImagenes } from "@/graficos/infraestructura/servidor/ArchivosAlmacenDeImagenes";
import { ArchivosHojaRepositorio } from "@/graficos/infraestructura/servidor/ArchivosHojaRepositorio";
import { EliminarObjeto, GuardarObjeto, ListarObjetos } from "@/objetos/aplicacion/casosDeUso";
import { ArchivosObjetoRepositorio } from "@/objetos/infraestructura/servidor/ArchivosObjetoRepositorio";

/*
 * Raíz de composición del SERVIDOR: el único lugar donde se eligen los adaptadores concretos
 * (archivos en disco) y se "enchufan" a los casos de uso. Si mañana querés guardar en una base de datos,
 * se cambia acá y en ningún otro lado.
 */
const hojas = new ArchivosHojaRepositorio();
const imagenes = new ArchivosAlmacenDeImagenes();
const objetos = new ArchivosObjetoRepositorio();

export const servidor = {
  hojas,
  imagenes,
  objetos,
  listarHojas: new ListarHojas(hojas),
  guardarHoja: new GuardarHoja(hojas),
  eliminarHoja: new EliminarHoja(hojas, imagenes),
  listarObjetos: new ListarObjetos(objetos),
  guardarObjeto: new GuardarObjeto(objetos),
  eliminarObjeto: new EliminarObjeto(objetos),
};
