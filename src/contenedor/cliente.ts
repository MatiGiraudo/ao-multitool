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
  QuitarFondoDeHoja,
  QuitarFondoEnLote,
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
  ExportarGraficosIni,
  ExportarObjetosClasicos,
  GrhDeRecorte,
  ImportarTablaDeGrh,
} from "@/importacion/aplicacion/casosDeUso";
import { PuenteDeGrh } from "@/importacion/aplicacion/PuenteDeGrh";
import {
  AbrirMapaClasico,
  AbrirMapaGuardado,
  EliminarMapaGuardado,
  ExportarMapasAlJuego,
  GuardarMapa,
  LeerTodosLosMapas,
  ListarMapasGuardados,
  ResolverGraficosDelMapa,
} from "@/mapas/aplicacion/casosDeUso";
import { HttpMapaRepositorio } from "@/mapas/infraestructura/navegador/HttpMapaRepositorio";
import { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import { CarpetaCabezaRepositorio, CarpetaCuerpoRepositorio } from "@/apariencias/infraestructura/carpeta/CarpetaApariencias";
import { CarpetaEfectoRepositorio } from "@/fx/infraestructura/carpeta/CarpetaEfectoRepositorio";
import { CarpetaHechizoRepositorio } from "@/hechizos/infraestructura/carpeta/CarpetaHechizoRepositorio";
import { CarpetaNpcRepositorio } from "@/npcs/infraestructura/carpeta/CarpetaNpcRepositorio";
import { CarpetaObjetoRepositorio } from "@/objetos/infraestructura/carpeta/CarpetaObjetoRepositorio";
import type { AlmacenDeImagenes, UbicadorDeImagenes } from "@/graficos/aplicacion/puertos";
import { CarpetaAlmacenDeImagenes } from "@/graficos/infraestructura/carpeta/CarpetaAlmacenDeImagenes";
import { CarpetaHojaRepositorio } from "@/graficos/infraestructura/carpeta/CarpetaHojaRepositorio";
import { CarpetaOriginales } from "@/importacion/infraestructura/carpeta/CarpetaOriginales";
import { CarpetaTablaDeGrh } from "@/importacion/infraestructura/carpeta/CarpetaTablaDeGrh";
import { HttpOriginales } from "@/importacion/infraestructura/navegador/HttpOriginales";
import { CarpetaMapaRepositorio } from "@/mapas/infraestructura/carpeta/CarpetaMapaRepositorio";
import { CarpetaAlmacenDeExportacion } from "@/proyecto/infraestructura/carpeta/CarpetaAlmacenDeExportacion";
import { LectorAparienciasIni } from "@/importacion/infraestructura/LectorAparienciasIni";
import { LectorFxsIni } from "@/importacion/infraestructura/LectorFxsIni";
import { EscritorGraficosIni } from "@/importacion/infraestructura/EscritorGraficosIni";
import { EscritorObjDat } from "@/importacion/infraestructura/EscritorObjDat";
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
 * De dónde salen los datos. Son dos modos con los mismos casos de uso y los mismos formatos:
 *
 * - `servidor`: el disco lo toca el servidor y el navegador le habla por HTTP. Es lo que corre
 *   cuando levantás la app en tu máquina, y lo que viene por defecto.
 * - `carpeta`: no hay servidor de datos; el navegador lee y escribe directamente en una carpeta
 *   que elige el usuario. Es lo que hace falta para desplegar el editor en un servidor público
 *   sin que los archivos de nadie suban a ningún lado.
 *
 * Se elige al compilar, con `NEXT_PUBLIC_AO_MODO=carpeta`, porque lo que cambia es qué adaptadores
 * se enchufan y eso se decide una vez, no por pantalla.
 */
export type ModoDeDatos = "servidor" | "carpeta";
export const MODO_DE_DATOS: ModoDeDatos = process.env.NEXT_PUBLIC_AO_MODO === "carpeta" ? "carpeta" : "servidor";

/** La carpeta elegida, compartida por todos los adaptadores del modo carpeta. */
export const carpetaDelProyecto = new CarpetaDelProyecto();

/*
 * Raíz de composición del NAVEGADOR: los mismos casos de uso que podrían correr en el servidor,
 * pero enchufados a adaptadores HTTP (o a la carpeta del usuario) y a canvas. La interfaz sólo
 * habla con este objeto.
 */
function crear() {
  const enCarpeta = MODO_DE_DATOS === "carpeta";
  const ids = new GeneradorDeIdsAleatorio();
  const hojas = enCarpeta ? new CarpetaHojaRepositorio(carpetaDelProyecto) : new HttpHojaRepositorio();
  /* Anotado con los puertos y no con la clase: lo que la interfaz puede usar es lo que dice el
   * puerto, no lo que trae de más el adaptador que haya tocado. */
  const imagenes: AlmacenDeImagenes & UbicadorDeImagenes = enCarpeta
    ? new CarpetaAlmacenDeImagenes(carpetaDelProyecto)
    : new HttpAlmacenDeImagenes();
  const procesador = new CanvasProcesadorDeImagenes();
  const formatoAnim = new FormatoAoAnim();
  const objetos = enCarpeta ? new CarpetaObjetoRepositorio(carpetaDelProyecto) : new HttpObjetoRepositorio();
  const formatoObjs = new FormatoAoObjs();
  const efectos = enCarpeta ? new CarpetaEfectoRepositorio(carpetaDelProyecto) : new HttpEfectoRepositorio();
  const formatoFx = new FormatoAoFx();
  const cuerpos = enCarpeta ? new CarpetaCuerpoRepositorio(carpetaDelProyecto) : new HttpCuerpoRepositorio();
  const formatoCuerpos = new FormatoAoBodies();
  const cabezas = enCarpeta ? new CarpetaCabezaRepositorio(carpetaDelProyecto) : new HttpCabezaRepositorio();
  const formatoCabezas = new FormatoAoHeads();
  const tablaDeGrh = enCarpeta ? new CarpetaTablaDeGrh(carpetaDelProyecto) : new HttpTablaDeGrh();
  const originales = enCarpeta ? new CarpetaOriginales(carpetaDelProyecto) : new HttpOriginales();
  const hechizos = enCarpeta ? new CarpetaHechizoRepositorio(carpetaDelProyecto) : new HttpHechizoRepositorio();
  const npcs = enCarpeta ? new CarpetaNpcRepositorio(carpetaDelProyecto) : new HttpNpcRepositorio();
  const formatoNpcs = new FormatoAoNpcs();
  const formatoHechizos = new FormatoAoSpells();
  const importarObjetos = new ImportarObjetos(objetos, formatoObjs, ids);
  const importarCuerpos = new ImportarApariencias(cuerpos, formatoCuerpos, ids, ESPECIE_CUERPO);
  const importarCabezas = new ImportarApariencias(cabezas, formatoCabezas, ids, ESPECIE_CABEZA);
  const importarEfectos = new ImportarEfectos(efectos, formatoFx, ids);
  const fabricaDeCatalogo = (hs: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hs);
  // El puente GRH → animación lo comparten los cuatro importadores del clásico.
  const puente = new PuenteDeGrh(hojas, ids);

  const quitarFondoDeHoja = new QuitarFondoDeHoja(hojas, imagenes, procesador);
  const mapasGuardados = enCarpeta ? new CarpetaMapaRepositorio(carpetaDelProyecto) : new HttpMapaRepositorio();
  /* Uno solo: lo usan el botón de «Importar» y la exportación del mundo entero. */
  const exportarGraficosIni = new ExportarGraficosIni(tablaDeGrh, new EscritorGraficosIni());
  const leerTodosLosMapas = new LeerTodosLosMapas(mapasGuardados);

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
      quitarFondo: quitarFondoDeHoja,
      quitarFondoEnLote: new QuitarFondoEnLote(quitarFondoDeHoja),
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
    mapas: {
      abrir: new AbrirMapaClasico(),
      resolverGraficos: new ResolverGraficosDelMapa(tablaDeGrh, hojas),
      listarGuardados: new ListarMapasGuardados(mapasGuardados),
      abrirGuardado: new AbrirMapaGuardado(mapasGuardados),
      guardar: new GuardarMapa(mapasGuardados),
      eliminarGuardado: new EliminarMapaGuardado(mapasGuardados),
    },
    clasico: {
      tablaDeGrh: new ImportarTablaDeGrh(new LectorGraficosIni(), tablaDeGrh, hojas),
      objetos: new ImportarObjetosClasicos(new LectorObjDat(), tablaDeGrh, puente, hojas, importarObjetos, fabricaDeCatalogo, originales),
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
      /** Para los gráficos propios: el número con el que se dibuja un recorte, y la tabla de vuelta. */
      grhDeRecorte: new GrhDeRecorte(tablaDeGrh),
      exportarGraficos: exportarGraficosIni,
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
      ],
      [
        // El mundo: los tres archivos de cada mapa, y la tabla de GRH que les da sentido.
        () => new ExportarMapasAlJuego(leerTodosLosMapas).ejecutar(),
        () => exportarGraficosIni.archivoSiHay(),
      ],
      [
        // Los archivos del AO original, con todo lo que el editor no entiende de vuelta en su lugar.
        () => new ExportarObjetosClasicos(() => new ListarObjetos(objetos).ejecutar(), originales, new EscritorObjDat()).ejecutar(),
      ]),
      guardarExportacion: new GuardarExportacion(enCarpeta ? new CarpetaAlmacenDeExportacion(carpetaDelProyecto) : new HttpAlmacenDeExportacion()),
      revisar: new RevisarMundo(
        hojas,
        {
          objetos: () => new ListarObjetos(objetos).ejecutar(),
          efectos: () => new ListarEfectos(efectos).ejecutar(),
          cuerpos: () => new ListarApariencias(cuerpos).ejecutar(),
          cabezas: () => new ListarApariencias(cabezas).ejecutar(),
          hechizos: () => new ListarHechizos(hechizos).ejecutar(),
          npcs: () => new ListarNpcs(npcs).ejecutar(),
          mapas: () => leerTodosLosMapas.ejecutar(),
          grhConocidos: async () => (await tablaDeGrh.leer())?.datos().map((g) => g.numero) ?? [],
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
