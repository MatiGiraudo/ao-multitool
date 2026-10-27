"use client";
import { GeneradorDeIdsAleatorio } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import {
  CargarHojasEnLote,
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
  CrearApariencia,
  DuplicarApariencia,
  EliminarApariencia,
  ExportarApariencias,
  GuardarApariencia,
  ImportarApariencias,
  ListarApariencias,
} from "@/apariencias/aplicacion/casosDeUso";
import { ESPECIE_CABEZA } from "@/apariencias/dominio/Cabeza";
import { ESPECIE_CUERPO } from "@/apariencias/dominio/Cuerpo";
import { FormatoAoBodies } from "@/apariencias/infraestructura/FormatoAoBodies";
import { FormatoAoHeads } from "@/apariencias/infraestructura/FormatoAoHeads";
import { HttpCabezaRepositorio, HttpCuerpoRepositorio } from "@/apariencias/infraestructura/navegador/HttpApariencias";
import {
  CrearEfecto,
  DuplicarEfecto,
  EliminarEfecto,
  ExportarEfectos,
  GuardarEfecto,
  ImportarEfectos,
  ListarEfectos,
} from "@/fx/aplicacion/casosDeUso";
import { FormatoAoFx } from "@/fx/infraestructura/FormatoAoFx";
import { HttpEfectoRepositorio } from "@/fx/infraestructura/navegador/HttpEfectoRepositorio";
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
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { FormatoAoObjs } from "@/objetos/infraestructura/FormatoAoObjs";
import { HttpObjetoRepositorio } from "@/objetos/infraestructura/navegador/HttpObjetoRepositorio";
import {
  CrearHechizo,
  DuplicarHechizo,
  EliminarHechizo,
  ExportarHechizos,
  GuardarHechizo,
  ImportarHechizos,
  ListarHechizos,
} from "@/hechizos/aplicacion/casosDeUso";
import { FormatoAoSpells } from "@/hechizos/infraestructura/FormatoAoSpells";
import { HttpHechizoRepositorio } from "@/hechizos/infraestructura/navegador/HttpHechizoRepositorio";
import {
  CrearNpc,
  DuplicarNpc,
  EliminarNpc,
  ExportarNpcs,
  GuardarNpc,
  ImportarNpcs,
  ListarNpcs,
} from "@/npcs/aplicacion/casosDeUso";
import { FormatoAoNpcs } from "@/npcs/infraestructura/FormatoAoNpcs";
import { HttpNpcRepositorio } from "@/npcs/infraestructura/navegador/HttpNpcRepositorio";
import {
  ImportarCabezasClasicas,
  ImportarCuerposClasicos,
  ImportarEfectosClasicos,
  ImportarHechizosClasicos,
  ImportarNpcsClasicos,
  ImportarObjetosClasicos,
  ImportarTablaDeGrh,
} from "@/importacion/aplicacion/casosDeUso";
import { PuenteDeGrh } from "@/importacion/aplicacion/PuenteDeGrh";
import { LectorAparienciasIni } from "@/importacion/infraestructura/LectorAparienciasIni";
import { LectorFxsIni } from "@/importacion/infraestructura/LectorFxsIni";
import { LectorGraficosIni } from "@/importacion/infraestructura/LectorGraficosIni";
import { LectorHechizosDat } from "@/importacion/infraestructura/LectorHechizosDat";
import { LectorNpcsDat } from "@/importacion/infraestructura/LectorNpcsDat";
import { LectorObjDat } from "@/importacion/infraestructura/LectorObjDat";
import { HttpTablaDeGrh } from "@/importacion/infraestructura/navegador/HttpTablaDeGrh";
import { ExportarTodo, GuardarExportacion } from "@/proyecto/aplicacion/ExportarTodo";
import { ImportarProyectoLegado } from "@/proyecto/aplicacion/ImportarProyectoLegado";
import { RevisarMundo } from "@/proyecto/aplicacion/RevisarMundo";
import { HttpAlmacenDeExportacion } from "@/proyecto/infraestructura/navegador/HttpAlmacenDeExportacion";
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
  const efectos = new HttpEfectoRepositorio();
  const formatoFx = new FormatoAoFx();
  const cuerpos = new HttpCuerpoRepositorio();
  const formatoCuerpos = new FormatoAoBodies();
  const cabezas = new HttpCabezaRepositorio();
  const formatoCabezas = new FormatoAoHeads();
  const tablaDeGrh = new HttpTablaDeGrh();
  const hechizos = new HttpHechizoRepositorio();
  const npcs = new HttpNpcRepositorio();
  const formatoNpcs = new FormatoAoNpcs();
  const formatoHechizos = new FormatoAoSpells();
  const importarObjetos = new ImportarObjetos(objetos, formatoObjs, ids);
  const importarCuerpos = new ImportarApariencias(cuerpos, formatoCuerpos, ids, ESPECIE_CUERPO);
  const importarCabezas = new ImportarApariencias(cabezas, formatoCabezas, ids, ESPECIE_CABEZA);
  const importarEfectos = new ImportarEfectos(efectos, formatoFx, ids);
  const fabricaDeCatalogo = (hs: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hs);
  // El puente GRH → animación lo comparten los cuatro importadores del clásico.
  const puente = new PuenteDeGrh(hojas, ids);

  return {
    ubicadorDeImagenes: imagenes,
    crearCatalogo: fabricaDeCatalogo,
    graficos: {
      listar: new ListarHojas(hojas),
      crearDesdeImagen: new CrearHojaDesdeImagen(hojas, imagenes, procesador, ids),
      crearVacia: new CrearHojaVacia(hojas, ids),
      cargarEnLote: new CargarHojasEnLote(hojas, imagenes, procesador, ids),
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
    fx: {
      listar: new ListarEfectos(efectos),
      crear: new CrearEfecto(efectos, ids),
      guardar: new GuardarEfecto(efectos),
      duplicar: new DuplicarEfecto(efectos, ids),
      eliminar: new EliminarEfecto(efectos),
      exportar: new ExportarEfectos(efectos, formatoFx),
      importar: importarEfectos,
    },
    cuerpos: {
      listar: new ListarApariencias(cuerpos),
      crear: new CrearApariencia(cuerpos, ids, ESPECIE_CUERPO),
      guardar: new GuardarApariencia(cuerpos),
      duplicar: new DuplicarApariencia(cuerpos, ids, ESPECIE_CUERPO),
      eliminar: new EliminarApariencia(cuerpos),
      exportar: new ExportarApariencias(cuerpos, formatoCuerpos),
      importar: importarCuerpos,
    },
    cabezas: {
      listar: new ListarApariencias(cabezas),
      crear: new CrearApariencia(cabezas, ids, ESPECIE_CABEZA),
      guardar: new GuardarApariencia(cabezas),
      duplicar: new DuplicarApariencia(cabezas, ids, ESPECIE_CABEZA),
      eliminar: new EliminarApariencia(cabezas),
      exportar: new ExportarApariencias(cabezas, formatoCabezas),
      importar: importarCabezas,
    },
    hechizos: {
      listar: new ListarHechizos(hechizos),
      crear: new CrearHechizo(hechizos, ids),
      guardar: new GuardarHechizo(hechizos),
      duplicar: new DuplicarHechizo(hechizos, ids),
      eliminar: new EliminarHechizo(hechizos),
      exportar: new ExportarHechizos(hechizos, formatoHechizos),
      importar: new ImportarHechizos(hechizos, formatoHechizos, ids),
    },
    npcs: {
      listar: new ListarNpcs(npcs),
      crear: new CrearNpc(npcs, ids),
      guardar: new GuardarNpc(npcs),
      duplicar: new DuplicarNpc(npcs, ids),
      eliminar: new EliminarNpc(npcs),
      exportar: new ExportarNpcs(npcs, formatoNpcs),
      importar: new ImportarNpcs(npcs, formatoNpcs, ids),
    },
    clasico: {
      tablaDeGrh: new ImportarTablaDeGrh(new LectorGraficosIni(), tablaDeGrh, hojas),
      objetos: new ImportarObjetosClasicos(new LectorObjDat(), tablaDeGrh, puente, hojas, importarObjetos, fabricaDeCatalogo),
      cuerpos: new ImportarCuerposClasicos(
        new LectorAparienciasIni("body", "Walk", "Personajes.ini"),
        tablaDeGrh,
        puente,
        hojas,
        importarCuerpos,
        fabricaDeCatalogo,
      ),
      cabezas: new ImportarCabezasClasicas(
        new LectorAparienciasIni("head", "Head", "Cabezas.ini"),
        tablaDeGrh,
        puente,
        hojas,
        importarCabezas,
        fabricaDeCatalogo,
      ),
      fx: new ImportarEfectosClasicos(new LectorFxsIni(), tablaDeGrh, puente, hojas, importarEfectos, fabricaDeCatalogo),
      hechizos: new ImportarHechizosClasicos(new LectorHechizosDat(), new ImportarHechizos(hechizos, formatoHechizos, ids)),
      npcs: new ImportarNpcsClasicos(new LectorNpcsDat(), new ImportarNpcs(npcs, formatoNpcs, ids)),
    },
    proyecto: {
      importarLegado: new ImportarProyectoLegado(new LectorAoProj(), hojas, imagenes, procesador, importarObjetos, fabricaDeCatalogo, ids),
      // Los exportadores de cada módulo, ya enchufados: el caso de uso sólo sabe que son funciones.
      exportarTodo: new ExportarTodo(hojas, formatoAnim, fabricaDeCatalogo, [
        (catalogo) => new ExportarObjetos(objetos, formatoObjs).ejecutar(catalogo),
        (catalogo) => new ExportarEfectos(efectos, formatoFx).ejecutar(catalogo),
        (catalogo) => new ExportarApariencias(cuerpos, formatoCuerpos).ejecutar(catalogo),
        (catalogo) => new ExportarApariencias(cabezas, formatoCabezas).ejecutar(catalogo),
        () => new ExportarHechizos(hechizos, formatoHechizos).ejecutar(),
        () => new ExportarNpcs(npcs, formatoNpcs).ejecutar(),
      ]),
      guardarExportacion: new GuardarExportacion(new HttpAlmacenDeExportacion()),
      revisar: new RevisarMundo(
        hojas,
        {
          objetos: () => new ListarObjetos(objetos).ejecutar(),
          efectos: () => new ListarEfectos(efectos).ejecutar(),
          cuerpos: () => new ListarApariencias(cuerpos).ejecutar(),
          cabezas: () => new ListarApariencias(cabezas).ejecutar(),
          hechizos: () => new ListarHechizos(hechizos).ejecutar(),
          npcs: () => new ListarNpcs(npcs).ejecutar(),
        },
        fabricaDeCatalogo,
      ),
    },
  };
}

export type ContenedorCliente = ReturnType<typeof crear>;

let instancia: ContenedorCliente | null = null;
export function contenedorCliente(): ContenedorCliente {
  if (!instancia) instancia = crear();
  return instancia;
}
