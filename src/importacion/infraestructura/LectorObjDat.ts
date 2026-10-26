import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { tipoDeObjeto, type TipoDeObjetoId } from "@/objetos/dominio/TipoDeObjeto";
import type { LectorDeObjetosClasicos, ObjetoClasico } from "../aplicacion/puertos";
import { ArchivoIni } from "./LectorIni";

/*
 * Lee el `OBJ.dat` del AO clásico:
 *
 *     [OBJ1]
 *     Name=Daga
 *     ObjType=2
 *     GrhIndex=505
 *     MinHIT=1
 *     MaxHIT=4
 *     Valor=50
 *     Newbie=1
 *
 * Esta es la capa anticorrupción con el AO original: todo lo que sabe de SUS números y SUS nombres
 * de clave vive acá, y de este archivo sale el vocabulario del editor.
 */

/** `ObjType` del clásico → el tipo de objeto del editor. Lo que no está mapeado cae en "otro". */
const TIPOS: Readonly<Record<number, TipoDeObjetoId>> = {
  1: "comida", // de un solo uso
  2: "arma",
  3: "armadura",
  5: "oro",
  9: "llave",
  11: "pocion",
  13: "comida", // bebidas
  14: "recurso", // leña
  16: "escudo",
  17: "casco",
  23: "recurso", // minerales
  24: "pergamino",
  29: "recurso", // gemas
  30: "recurso", // flores
  34: "comida", // botella llena
};

/** `TipoPocion` del clásico → el efecto que entiende la ficha de poción. */
const EFECTOS: Readonly<Record<number, string>> = {
  1: "agilidad",
  2: "fuerza",
  3: "vida",
  4: "mana",
  5: "cura_veneno",
};

export class LectorObjDat implements LectorDeObjetosClasicos {
  leer(texto: string): ObjetoClasico[] {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("obj");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [OBJn]: ¿seguro que es un OBJ.dat?");

    return secciones.map(({ seccion, numero }) => {
      const tipo = TIPOS[ini.entero(seccion, "ObjType")] ?? "otro";
      return {
        numero,
        nombre: ini.texto(seccion, "Name") || ini.texto(seccion, "Nombre"),
        tipo,
        valor: Math.max(0, ini.entero(seccion, "Valor")),
        descripcion: ini.texto(seccion, "Texto"),
        // El clásico no marca qué se apila: se deduce del tipo, igual que al crear un objeto acá.
        apilable: !tipoDeObjeto(tipo).equipable,
        nivelMinimo: 0,
        banderas: banderas(ini, seccion),
        atributos: atributos(ini, seccion, tipo),
        grhIcono: ini.entero(seccion, "GrhIndex"),
      };
    });
  }
}

function banderas(ini: ArchivoIni, seccion: string): string[] {
  const out: string[] = [];
  if (ini.bandera(seccion, "Newbie")) out.push("newbie");
  // "Crucial" es lo que el clásico llama a lo que no se cae al morir.
  if (ini.bandera(seccion, "Crucial")) out.push("noCae");
  if (ini.bandera(seccion, "Instransferible") || ini.bandera(seccion, "Intransferible")) out.push("intransferible");
  if (ini.bandera(seccion, "DosManos")) out.push("dosManos");
  if (ini.bandera(seccion, "Proyectil")) out.push("proyectil");
  return out;
}

function atributos(ini: ArchivoIni, seccion: string, tipo: TipoDeObjetoId): Record<string, ValorDeAtributo> {
  const out: Record<string, ValorDeAtributo> = {};
  const poner = (clave: string, valor: number) => {
    if (valor > 0) out[clave] = valor;
  };

  switch (tipo) {
    case "arma":
      poner("minHit", ini.entero(seccion, "MinHIT"));
      poner("maxHit", ini.entero(seccion, "MaxHIT"));
      break;
    case "armadura":
    case "casco":
    case "escudo":
      poner("minDef", ini.entero(seccion, "MinDef") || ini.entero(seccion, "Def"));
      poner("maxDef", ini.entero(seccion, "MaxDef") || ini.entero(seccion, "Def"));
      break;
    case "pocion": {
      const efecto = EFECTOS[ini.entero(seccion, "TipoPocion")];
      if (efecto) out.efecto = efecto;
      poner("min", ini.entero(seccion, "MinModificador"));
      poner("max", ini.entero(seccion, "MaxModificador"));
      poner("duracion", ini.entero(seccion, "DuracionEfecto"));
      break;
    }
    case "comida":
      poner("hambre", ini.entero(seccion, "MinHam"));
      poner("sed", ini.entero(seccion, "MinSed"));
      break;
    case "pergamino":
      poner("hechizo", ini.entero(seccion, "HechizoIndex"));
      break;
    case "llave": {
      const clave = ini.texto(seccion, "Clave");
      if (clave) out.clave = clave;
      break;
    }
  }
  return out;
}
