import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { Animacion } from "../dominio/Animacion";
import { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../dominio/HojaRepositorio";
import type { Tamanio } from "../dominio/Tamanio";
import type { AlmacenDeImagenes, CalidadDeEscalado, FormatoDeAnimaciones, ProcesadorDeImagenes } from "./puertos";

/*
 * Casos de uso del módulo Gráficos. Cada clase hace UNA cosa (principio de responsabilidad única)
 * y recibe sus dependencias por constructor, como interfaces (principio de inversión de dependencias).
 * No saben nada de React, de Next ni del disco: eso lo resuelven los adaptadores.
 */

export class ListarHojas {
  constructor(private readonly repo: HojaRepositorio) {}
  async ejecutar(): Promise<HojaDeSprites[]> {
    const hojas = await this.repo.listar();
    return hojas.sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo));
  }
}

async function obtenerOFallar(repo: HojaRepositorio, id: string): Promise<HojaDeSprites> {
  const h = await repo.obtener(id);
  if (!h) throw new ErrorDeDominio("Esa hoja ya no existe.");
  return h;
}

export class CrearHojaDesdeImagen {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
    private readonly procesador: ProcesadorDeImagenes,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(entrada: { archivo: Blob; nombreArchivo: string }): Promise<HojaDeSprites> {
    const { png, tamanio } = await this.procesador.decodificar(entrada.archivo);
    const hoja = HojaDeSprites.crear(this.ids.nuevo(), entrada.nombreArchivo, this.ids.nuevo()).conImagenNueva(tamanio);
    await this.imagenes.guardar(hoja.id, png, "actual");
    await this.imagenes.guardar(hoja.id, png, "original");
    await this.repo.guardar(hoja);
    return hoja;
  }
}

export class ReemplazarImagenDeHoja {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
    private readonly procesador: ProcesadorDeImagenes,
  ) {}
  async ejecutar(entrada: { hojaId: string; archivo: Blob; nombreArchivo?: string }): Promise<HojaDeSprites> {
    const hoja = await obtenerOFallar(this.repo, entrada.hojaId);
    const { png, tamanio } = await this.procesador.decodificar(entrada.archivo);
    const nueva = hoja.conImagenNueva(tamanio, entrada.nombreArchivo);
    await this.imagenes.guardar(hoja.id, png, "actual");
    await this.imagenes.guardar(hoja.id, png, "original");
    await this.repo.guardar(nueva);
    return nueva;
  }
}

/** Guarda una hoja que se editó en memoria (frames movidos, animaciones renombradas, etc.). */
export class GuardarHoja {
  constructor(private readonly repo: HojaRepositorio) {}
  async ejecutar(hoja: HojaDeSprites): Promise<void> {
    await this.repo.guardar(hoja);
  }
}

export class CrearHojaVacia {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(nombreArchivo: string): Promise<HojaDeSprites> {
    const hoja = HojaDeSprites.crear(this.ids.nuevo(), nombreArchivo, this.ids.nuevo());
    await this.repo.guardar(hoja);
    return hoja;
  }
}

export class EliminarHoja {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
  ) {}
  async ejecutar(hojaId: string): Promise<void> {
    await this.repo.eliminar(hojaId);
    await this.imagenes.eliminar(hojaId);
  }
}

export class RedimensionarHoja {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
    private readonly procesador: ProcesadorDeImagenes,
  ) {}
  async ejecutar(e: { hojaId: string; tamanio: Tamanio; calidad: CalidadDeEscalado; escalarContenido: boolean }): Promise<HojaDeSprites> {
    const hoja = await obtenerOFallar(this.repo, e.hojaId);
    const actual = await this.imagenes.leer(hoja.id, "actual");
    if (!actual) throw new ErrorDeDominio("Esta hoja todavía no tiene imagen.");
    const nueva = hoja.redimensionada(e.tamanio, e.escalarContenido);
    // Si es el primer redimensionado, guardamos la imagen de ahora como original.
    if (!(await this.imagenes.leer(hoja.id, "original"))) await this.imagenes.guardar(hoja.id, actual, "original");
    const png = await this.procesador.redimensionar(actual, e.tamanio, e.calidad);
    await this.imagenes.guardar(hoja.id, png, "actual");
    await this.repo.guardar(nueva);
    return nueva;
  }
}

export class RestaurarImagenOriginal {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
  ) {}
  async ejecutar(e: { hojaId: string; escalarContenido: boolean }): Promise<HojaDeSprites> {
    const hoja = await obtenerOFallar(this.repo, e.hojaId);
    const original = await this.imagenes.leer(hoja.id, "original");
    if (!original || !hoja.tamanioOriginal || !hoja.fueRedimensionada)
      throw new ErrorDeDominio("No hay una imagen original distinta para restaurar.");
    const nueva = hoja.redimensionada(hoja.tamanioOriginal, e.escalarContenido);
    await this.imagenes.guardar(hoja.id, original, "actual");
    await this.repo.guardar(nueva);
    return nueva;
  }
}

export class ExportarAnimaciones {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly formato: FormatoDeAnimaciones,
  ) {}
  async ejecutar(hojaId: string): Promise<{ nombreArchivo: string; contenido: string }> {
    const hoja = await obtenerOFallar(this.repo, hojaId);
    return { nombreArchivo: this.formato.nombreDeArchivoPara(hoja), contenido: this.formato.exportar(hoja) };
  }
}

/**
 * Importa un .anim.json. Si ya hay una hoja con ese nombre de archivo, mezcla las animaciones por nombre;
 * si no, crea una hoja nueva sin imagen (después se le carga el PNG con "Reemplazar imagen").
 */
export class ImportarAnimaciones {
  constructor(
    private readonly repo: HojaRepositorio,
    private readonly formato: FormatoDeAnimaciones,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(texto: string): Promise<{ hoja: HojaDeSprites; creada: boolean }> {
    const datos = this.formato.leer(texto);
    const existentes = await this.repo.listar();
    let hoja = datos.nombreArchivo ? existentes.find((h) => h.nombreArchivo === datos.nombreArchivo) : undefined;
    const creada = !hoja;
    if (!hoja) {
      hoja = HojaDeSprites.crear(this.ids.nuevo(), datos.nombreArchivo ?? "hoja_importada.png", this.ids.nuevo());
      hoja = hoja.sinAnimacion(hoja.animaciones[0]!.id);
    }
    const animaciones = datos.animaciones.map((a) => Animacion.reconstituir({ ...a, id: this.ids.nuevo() }));
    hoja = hoja.conAnimacionesImportadas(animaciones);
    if (datos.grilla) hoja = hoja.conGrilla(datos.grilla);
    await this.repo.guardar(hoja);
    return { hoja, creada };
  }
}
