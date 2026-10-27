import { catalogoDe } from "@/compartido/dominio/CatalogoPorNumero";
import type { Problema } from "@/compartido/dominio/Problema";
import type { Apariencia } from "@/apariencias/dominio/Apariencia";
import { ValidadorDeApariencias } from "@/apariencias/dominio/servicios";
import type { Efecto } from "@/fx/dominio/Efecto";
import { ValidadorDeEfectos } from "@/fx/dominio/servicios";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { Hechizo } from "@/hechizos/dominio/Hechizo";
import { ValidadorDeHechizos } from "@/hechizos/dominio/servicios";
import type { Npc } from "@/npcs/dominio/Npc";
import { ValidadorDeNpcs } from "@/npcs/dominio/servicios";
import type { Objeto } from "@/objetos/dominio/Objeto";
import { ValidadorDeObjetos } from "@/objetos/dominio/servicios";
import type { FabricaDeCatalogo } from "./ImportarProyectoLegado";

/*
 * El estado de salud del mundo entero, en una sola pantalla.
 *
 * Cada módulo ya sabe revisarse a sí mismo; lo que no puede hacer ninguno es mirar al de al lado.
 * Un pergamino que apunta a un hechizo que no existe no lo puede ver ni Objetos (no conoce los
 * hechizos) ni Hechizos (no sabe que alguien lo apunta): sólo se ve desde acá.
 *
 * Por eso este caso de uso vive en `proyecto/`, igual que la importación: es el único lugar que
 * tiene permiso para conocer a todos los módulos a la vez.
 */

/** Una entidad revisada, con lo que se le encontró. Vacío si está sana. */
export interface ItemRevisado {
  familia: string;
  /** Cómo nombrarla en la lista: "#12 Daga". */
  etiqueta: string;
  /** A qué pantalla ir para arreglarlo. */
  href: string;
  problemas: Problema[];
}

export interface ResumenDeFamilia {
  familia: string;
  href: string;
  revisadas: number;
  errores: number;
  avisos: number;
}

export interface RevisionDelMundo {
  /** Sólo las que tienen algo que mirar, ordenadas: primero los errores. */
  items: ItemRevisado[];
  familias: ResumenDeFamilia[];
  errores: number;
  avisos: number;
  revisadas: number;
}

export interface MundoParaRevisar {
  hojas: HojaDeSprites[];
  objetos: Objeto[];
  efectos: Efecto[];
  cuerpos: Apariencia[];
  cabezas: Apariencia[];
  hechizos: Hechizo[];
  npcs: Npc[];
}

/** De dónde sale cada familia. Se pasa entera para poder revisar sin montar las pantallas. */
export interface LectoresDelMundo {
  objetos(): Promise<Objeto[]>;
  efectos(): Promise<Efecto[]>;
  cuerpos(): Promise<Apariencia[]>;
  cabezas(): Promise<Apariencia[]>;
  hechizos(): Promise<Hechizo[]>;
  npcs(): Promise<Npc[]>;
}

export class RevisarMundo {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly lectores: LectoresDelMundo,
    private readonly fabricaDeCatalogo: FabricaDeCatalogo,
  ) {}

  async ejecutar(): Promise<RevisionDelMundo> {
    const [hojas, objetos, efectos, cuerpos, cabezas, hechizos, npcs] = await Promise.all([
      this.hojas.listar(),
      this.lectores.objetos(),
      this.lectores.efectos(),
      this.lectores.cuerpos(),
      this.lectores.cabezas(),
      this.lectores.hechizos(),
      this.lectores.npcs(),
    ]);
    return this.revisar({ hojas, objetos, efectos, cuerpos, cabezas, hechizos, npcs });
  }

  /** Lo mismo, con todo ya cargado: así los tests no necesitan repositorios. */
  revisar(mundo: MundoParaRevisar): RevisionDelMundo {
    const catalogo = this.fabricaDeCatalogo(mundo.hojas);
    const catalogoDeFx = catalogoDe(mundo.efectos.map((e) => ({ numero: e.numero, nombre: e.nombre })));
    const numerosDeHechizo = new Set(mundo.hechizos.map((h) => h.numero));

    const items: ItemRevisado[] = [];
    const familias: ResumenDeFamilia[] = [];

    const sumar = (familia: string, href: string, revisadas: number, encontrados: { etiqueta: string; problemas: Problema[] }[]) => {
      let errores = 0,
        avisos = 0;
      for (const { etiqueta, problemas } of encontrados) {
        if (!problemas.length) continue;
        errores += problemas.filter((p) => p.gravedad === "error").length;
        avisos += problemas.filter((p) => p.gravedad === "aviso").length;
        items.push({ familia, etiqueta, href, problemas });
      }
      familias.push({ familia, href, revisadas, errores, avisos });
    };

    sumar(
      "Gráficos",
      "/animaciones",
      mundo.hojas.length,
      mundo.hojas.map((h) => ({ etiqueta: h.nombreArchivo, problemas: problemasDeHoja(h) })),
    );

    sumar(
      "Objetos",
      "/objetos",
      mundo.objetos.length,
      mundo.objetos.map((o) => ({
        etiqueta: `#${o.numero} ${o.nombre || "(sin nombre)"}`,
        problemas: [...ValidadorDeObjetos.problemas(o, mundo.objetos, catalogo), ...problemasDePergamino(o, numerosDeHechizo)],
      })),
    );

    sumar(
      "Apariencias",
      "/apariencias",
      mundo.cuerpos.length + mundo.cabezas.length,
      [
        ...mundo.cuerpos.map((c) => ({ etiqueta: `Cuerpo #${c.numero} ${c.nombre || ""}`.trim(), problemas: ValidadorDeApariencias.problemas(c, mundo.cuerpos, catalogo) })),
        ...mundo.cabezas.map((c) => ({ etiqueta: `Cabeza #${c.numero} ${c.nombre || ""}`.trim(), problemas: ValidadorDeApariencias.problemas(c, mundo.cabezas, catalogo) })),
      ],
    );

    sumar(
      "FX",
      "/fx",
      mundo.efectos.length,
      mundo.efectos.map((e) => ({ etiqueta: `#${e.numero} ${e.nombre || "(sin nombre)"}`, problemas: ValidadorDeEfectos.problemas(e, mundo.efectos, catalogo) })),
    );

    sumar(
      "Hechizos",
      "/hechizos",
      mundo.hechizos.length,
      mundo.hechizos.map((h) => ({ etiqueta: `#${h.numero} ${h.nombre || "(sin nombre)"}`, problemas: ValidadorDeHechizos.problemas(h, mundo.hechizos, catalogoDeFx) })),
    );

    // El NPC es el que más apunta hacia afuera: cuerpo, cabeza, objetos y hechizos, todo por número.
    const catalogosDelNpc = {
      cuerpos: catalogoDe(mundo.cuerpos),
      cabezas: catalogoDe(mundo.cabezas),
      objetos: catalogoDe(mundo.objetos),
      hechizos: catalogoDe(mundo.hechizos),
    };
    sumar(
      "NPCs",
      "/npcs",
      mundo.npcs.length,
      mundo.npcs.map((n) => ({ etiqueta: `#${n.numero} ${n.nombre || "(sin nombre)"}`, problemas: ValidadorDeNpcs.problemas(n, mundo.npcs, catalogosDelNpc) })),
    );

    // Primero lo que está roto, y dentro de eso el orden en que se revisó.
    items.sort((a, b) => Number(tieneError(b)) - Number(tieneError(a)));

    return {
      items,
      familias,
      errores: familias.reduce((n, f) => n + f.errores, 0),
      avisos: familias.reduce((n, f) => n + f.avisos, 0),
      revisadas: familias.reduce((n, f) => n + f.revisadas, 0),
    };
  }
}

function tieneError(item: ItemRevisado): boolean {
  return item.problemas.some((p) => p.gravedad === "error");
}

/**
 * Lo que puede estar mal en una hoja. Los nombres repetidos son error y no aviso porque los
 * archivos de intercambio referencian las animaciones **por nombre**: con dos iguales, quien lea
 * el JSON no tiene forma de saber cuál es cuál.
 */
function problemasDeHoja(hoja: HojaDeSprites): Problema[] {
  const out: Problema[] = [];
  const repetidos = hoja.nombresRepetidos();
  if (repetidos.length) out.push({ gravedad: "error", mensaje: `Animaciones con el mismo nombre: ${repetidos.join(", ")}` });
  if (!hoja.tieneImagen) out.push({ gravedad: "aviso", mensaje: "Sin imagen cargada" });
  return out;
}

/** El chequeo que ningún módulo puede hacer solo: el pergamino apunta a un hechizo por número. */
function problemasDePergamino(objeto: Objeto, numerosDeHechizo: ReadonlySet<number>): Problema[] {
  if (objeto.tipo.id !== "pergamino") return [];
  const numero = Number(objeto.atributosVigentes().hechizo ?? 0);
  if (!numero) return [{ gravedad: "aviso", mensaje: "Pergamino sin hechizo" }];
  return numerosDeHechizo.has(numero) ? [] : [{ gravedad: "error", mensaje: `Apunta al hechizo ${numero}, que no existe` }];
}
