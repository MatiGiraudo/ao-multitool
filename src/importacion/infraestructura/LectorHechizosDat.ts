import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { HechizoImportado } from "@/hechizos/aplicacion/casosDeUso";
import type { HechizosClasicos, LectorDeHechizosClasicos } from "../aplicacion/puertos";
import { ArchivoIni } from "./LectorIni";

/*
 * Lee el `Hechizos.dat` del AO clásico:
 *
 *     [HECHIZO1]
 *     Nombre=Dardo Mágico
 *     PalabrasMagicas=OHL VOR PEK
 *     SubeHP=2
 *     MinHP=5
 *     MaxHP=10
 *     ManaRequerido=10
 *     FXgrh=5
 *
 * Lo particular de este archivo es que el efecto no es un campo: es un conjunto de banderas
 * sueltas (`Paraliza=1`, `Invisibilidad=1`, `SubeHP=2`…). Acá se traducen al único campo `tipo`
 * que usa el editor, mirándolas en orden de especificidad.
 */

/** `Target` del clásico → sobre qué se lanza. */
const OBJETIVOS: Readonly<Record<number, string>> = { 1: "usuario", 2: "npc", 3: "ambos", 4: "terreno" };

/**
 * Las claves que, si están, dicen qué hace el hechizo.
 *
 * El `Hechizos.dat` del cliente no trae ninguna —sólo nombre, descripción, palabras mágicas y
 * costos—, porque el cliente no necesita saber qué hace un hechizo para dibujarlo. Sin alguna de
 * éstas no hay efecto que leer: se importa el texto, que es real, y se avisa del resto.
 */
const SENALES_DE_EFECTO = [
  "Revivir",
  "Invoca",
  "RemoverParalisis",
  "Paraliza",
  "Inmoviliza",
  "CuraVeneno",
  "Envenena",
  "Invisibilidad",
  "Ceguera",
  "Estupidez",
  "SubeMana",
  "SubeSta",
  "SubeFuerza",
  "SubeAgilidad",
  "SubeHam",
  "SubeSed",
  "SubeHP",
] as const;

export class LectorHechizosDat implements LectorDeHechizosClasicos {
  leer(texto: string): HechizosClasicos {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("hechizo");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [HECHIZOn]: ¿seguro que es un Hechizos.dat?");

    const sinEfecto: number[] = [];
    const hechizos = secciones.map(({ seccion, numero }) => {
      if (!SENALES_DE_EFECTO.some((clave) => ini.texto(seccion, clave) !== "")) sinEfecto.push(numero);
      const { tipo, atributos } = efecto(ini, seccion);
      const banderas: string[] = [];
      if (ini.bandera(seccion, "NeedStaff")) banderas.push("baculo");
      if (ini.bandera(seccion, "AutoLanzar")) banderas.push("autolanzable");

      return {
        numero,
        nombre: ini.texto(seccion, "Nombre") || ini.texto(seccion, "Name"),
        descripcion: ini.texto(seccion, "Desc"),
        palabrasMagicas: ini.texto(seccion, "PalabrasMagicas"),
        tipo,
        objetivo: OBJETIVOS[ini.entero(seccion, "Target")] ?? "ambos",
        mana: ini.entero(seccion, "ManaRequerido"),
        energia: ini.entero(seccion, "StaRequerido"),
        skillRequerido: ini.entero(seccion, "MinSkill"),
        nivelMinimo: ini.entero(seccion, "MinLevel"),
        banderas,
        atributos,
        fx: ini.entero(seccion, "FXgrh"),
        sonido: ini.texto(seccion, "WAV"),
      };
    });
    const crudos = Object.fromEntries(secciones.map(({ seccion, numero }) => [numero, ini.lineasDe(seccion).join("\r\n")]));
    return { hechizos, sinEfecto, crudos, encabezado: ini.encabezado("hechizo").join("\r\n") };
  }
}

function efecto(ini: ArchivoIni, s: string): { tipo: string; atributos: Record<string, ValorDeAtributo> } {
  const rango = (min: string, max: string): Record<string, ValorDeAtributo> => {
    const out: Record<string, ValorDeAtributo> = {};
    const a = ini.entero(s, min),
      b = ini.entero(s, max);
    if (a > 0) out.min = a;
    if (b > 0) out.max = b;
    return out;
  };
  const conDuracion = (base: Record<string, ValorDeAtributo> = {}) => {
    const d = ini.entero(s, "Duracion");
    return d > 0 ? { ...base, duracion: d } : base;
  };
  const stat = (cual: string, min: string, max: string) => ({ tipo: "modificar_stat", atributos: conDuracion({ stat: cual, ...rango(min, max) }) });

  // De lo más específico a lo más general: un hechizo puede traer varias banderas en 1.
  if (ini.bandera(s, "Revivir")) return { tipo: "resucitar", atributos: {} };
  if (ini.bandera(s, "Invoca")) {
    const atributos: Record<string, ValorDeAtributo> = {};
    const npc = ini.entero(s, "NumNpc"),
      cantidad = ini.entero(s, "Cant");
    if (npc > 0) atributos.npc = npc;
    if (cantidad > 0) atributos.cantidad = cantidad;
    return { tipo: "invocar", atributos };
  }
  if (ini.bandera(s, "RemoverParalisis")) return { tipo: "remover_paralisis", atributos: {} };
  if (ini.bandera(s, "Paraliza") || ini.bandera(s, "Inmoviliza")) return { tipo: "paralizar", atributos: conDuracion() };
  if (ini.bandera(s, "CuraVeneno")) return { tipo: "curar_veneno", atributos: {} };
  if (ini.bandera(s, "Envenena")) return { tipo: "envenenar", atributos: conDuracion() };
  if (ini.bandera(s, "Invisibilidad")) return { tipo: "invisibilidad", atributos: conDuracion() };
  if (ini.bandera(s, "Ceguera")) return { tipo: "ceguera", atributos: conDuracion() };
  if (ini.bandera(s, "Estupidez")) return { tipo: "estupidez", atributos: conDuracion() };
  if (ini.bandera(s, "SubeMana")) return stat("mana", "MinMana", "MaxMana");
  if (ini.bandera(s, "SubeSta")) return stat("energia", "MinSta", "MaxSta");
  if (ini.bandera(s, "SubeFuerza")) return stat("fuerza", "MinFuerza", "MaxFuerza");
  if (ini.bandera(s, "SubeAgilidad")) return stat("agilidad", "MinAgilidad", "MaxAgilidad");
  if (ini.bandera(s, "SubeHam")) return stat("hambre", "MinHam", "MaxHam");
  if (ini.bandera(s, "SubeSed")) return stat("sed", "MinSed", "MaxSed");

  // `SubeHP` es el caso más común y el más traicionero: 1 cura, 2 hace daño.
  const hp = ini.entero(s, "SubeHP");
  if (hp === 2) return { tipo: "dano", atributos: rango("MinHP", "MaxHP") };
  return { tipo: "curacion", atributos: rango("MinHP", "MaxHP") };
}
