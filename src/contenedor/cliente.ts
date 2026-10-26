"use client";
import { GeneradorDeIdsAleatorio } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import {
  CrearHojaDesdeImagen,
  CrearHojaVacia,
  EliminarHoja,
  ExportarAnimaciones,
  GuardarHoja,
  ImportarAnimaciones,
  ListarHojas,
  RedimensionarHoja,
  ReemplazarImagenDeHoja,
  RestaurarImagenOriginal,
} from "@/graficos/aplicacion/casosDeUso";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { FormatoDeAnimaciones } from "@/graficos/aplicacion/puertos";
import { FormatoAoAnim } from "@/graficos/infraestructura/FormatoAoAnim";
import { CanvasProcesadorDeImagenes } from "@/graficos/infraestructura/navegador/CanvasProcesadorDeImagenes";
import { HttpAlmacenDeImagenes } from "@/graficos/infraestructura/navegador/HttpAlmacenDeImagenes";
import { HttpHojaRepositorio } from "@/graficos/infraestructura/navegador/HttpHojaRepositorio";
import {
  AutovincularEquipado,
  CrearObjeto,
  DuplicarObjeto,
  EliminarObjeto,
  ExportarObjetos,
  GuardarObjeto,
  ImportarObjetos,
  ListarObjetos,
} from "@/objetos/aplicacion/casosDeUso";
import { CatalogoGraficoDesdeHojas } from "@/objetos/infraestructura/CatalogoGraficoDesdeHojas";
import { FormatoAoObjs } from "@/objetos/infraestructura/FormatoAoObjs";
import { HttpObjetoRepositorio } from "@/objetos/infraestructura/navegador/HttpObjetoRepositorio";
import { ImportarProyectoLegado } from "@/proyecto/aplicacion/ImportarProyectoLegado";
import { LectorAoProj } from "@/proyecto/infraestructura/LectorAoProj";

/*
 * Raíz de composición del NAVEGADOR: los mismos casos de uso que podrían correr en el servidor,
 * pero enchufados a adaptadores HTTP y a canvas. La interfaz sólo habla con este objeto.
 */
function crear() {
  const ids = new GeneradorDeIdsAleatorio();
  const hojas = new HttpHojaRepositorio();
  const imagenes = new HttpAlmacenDeImagenes();
  const procesador = new CanvasProcesadorDeImagenes();
  const formatoAnim = new FormatoAoAnim();
  const objetos = new HttpObjetoRepositorio();
  const formatoObjs = new FormatoAoObjs();
  const importarObjetos = new ImportarObjetos(objetos, formatoObjs, ids);
  const fabricaDeCatalogo = (hs: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hs);

  return {
    ubicadorDeImagenes: imagenes,
    crearCatalogo: fabricaDeCatalogo,
    graficos: {
      listar: new ListarHojas(hojas),
      crearDesdeImagen: new CrearHojaDesdeImagen(hojas, imagenes, procesador, ids),
      crearVacia: new CrearHojaVacia(hojas, ids),
      reemplazarImagen: new ReemplazarImagenDeHoja(hojas, imagenes, procesador),
      guardar: new GuardarHoja(hojas),
      eliminar: new EliminarHoja(hojas, imagenes),
      redimensionar: new RedimensionarHoja(hojas, imagenes, procesador),
      restaurarOriginal: new RestaurarImagenOriginal(hojas, imagenes),
      exportar: new ExportarAnimaciones(hojas, formatoAnim),
      importar: new ImportarAnimaciones(hojas, formatoAnim, ids),
      nuevoId: () => ids.nuevo(),
      /** El formato de exportación, para mostrar el JSON en vivo mientras editás. */
      formato: formatoAnim as FormatoDeAnimaciones,
    },
    objetos: {
      listar: new ListarObjetos(objetos),
      crear: new CrearObjeto(objetos, ids),
      guardar: new GuardarObjeto(objetos),
      duplicar: new DuplicarObjeto(objetos, ids),
      eliminar: new EliminarObjeto(objetos),
      autovincular: new AutovincularEquipado(objetos),
      exportar: new ExportarObjetos(objetos, formatoObjs),
      importar: importarObjetos,
    },
    proyecto: {
      importarLegado: new ImportarProyectoLegado(new LectorAoProj(), hojas, imagenes, procesador, importarObjetos, fabricaDeCatalogo, ids),
    },
  };
}

export type ContenedorCliente = ReturnType<typeof crear>;

let instancia: ContenedorCliente | null = null;
export function contenedorCliente(): ContenedorCliente {
  if (!instancia) instancia = crear();
  return instancia;
}
