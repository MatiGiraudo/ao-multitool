import "server-only";
import { GuardarHoja, ListarHojas, EliminarHoja } from "@/graficos/aplicacion/casosDeUso";
import { ArchivosAlmacenDeImagenes } from "@/graficos/infraestructura/servidor/ArchivosAlmacenDeImagenes";
import { ArchivosHojaRepositorio } from "@/graficos/infraestructura/servidor/ArchivosHojaRepositorio";
import {
  EliminarApariencia,
  GuardarApariencia,
  ListarApariencias,
} from "@/apariencias/aplicacion/casosDeUso";
import { ArchivosCabezaRepositorio, ArchivosCuerpoRepositorio } from "@/apariencias/infraestructura/servidor/ArchivosApariencias";
import { EliminarEfecto, GuardarEfecto, ListarEfectos } from "@/fx/aplicacion/casosDeUso";
import { EliminarHechizo, GuardarHechizo, ListarHechizos } from "@/hechizos/aplicacion/casosDeUso";
import { ArchivosHechizoRepositorio } from "@/hechizos/infraestructura/servidor/ArchivosHechizoRepositorio";
import { ArchivosTablaDeGrh } from "@/importacion/infraestructura/servidor/ArchivosTablaDeGrh";
import { GuardarExportacion } from "@/proyecto/aplicacion/ExportarTodo";
import { ArchivosAlmacenDeExportacion } from "@/proyecto/infraestructura/servidor/ArchivosAlmacenDeExportacion";
import { ArchivosEfectoRepositorio } from "@/fx/infraestructura/servidor/ArchivosEfectoRepositorio";
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
const efectos = new ArchivosEfectoRepositorio();
const cuerpos = new ArchivosCuerpoRepositorio();
const cabezas = new ArchivosCabezaRepositorio();
const hechizos = new ArchivosHechizoRepositorio();
const tablaDeGrh = new ArchivosTablaDeGrh();

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
  efectos,
  listarEfectos: new ListarEfectos(efectos),
  guardarEfecto: new GuardarEfecto(efectos),
  eliminarEfecto: new EliminarEfecto(efectos),
  cuerpos,
  listarCuerpos: new ListarApariencias(cuerpos),
  guardarCuerpo: new GuardarApariencia(cuerpos),
  eliminarCuerpo: new EliminarApariencia(cuerpos),
  cabezas,
  listarCabezas: new ListarApariencias(cabezas),
  guardarCabeza: new GuardarApariencia(cabezas),
  eliminarCabeza: new EliminarApariencia(cabezas),
  hechizos,
  listarHechizos: new ListarHechizos(hechizos),
  guardarHechizo: new GuardarHechizo(hechizos),
  eliminarHechizo: new EliminarHechizo(hechizos),
  tablaDeGrh,
  guardarExportacion: new GuardarExportacion(new ArchivosAlmacenDeExportacion()),
};
