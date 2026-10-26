import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { Hechizo } from "../dominio/Hechizo";
import { esObjetivoValido, esTipoDeHechizoValido, type ObjetivoDeHechizo, type TipoDeHechizoId } from "../dominio/TipoDeHechizo";

/** Forma plana de un hechizo para guardarlo en disco y mandarlo por HTTP. */
export interface HechizoDto {
  clave: string;
  numero: number;
  nombre: string;
  descripcion: string;
  palabrasMagicas: string;
  tipo: TipoDeHechizoId;
  objetivo: ObjetivoDeHechizo;
  mana: number;
  energia: number;
  skillRequerido: number;
  nivelMinimo: number;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  fx: number;
  sonido: string;
  esEjemplo?: boolean;
}

export const HechizoMapper = {
  aDto(h: Hechizo): HechizoDto {
    const d = h.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      descripcion: d.descripcion,
      palabrasMagicas: d.palabrasMagicas,
      tipo: d.tipo,
      objetivo: d.objetivo,
      mana: d.mana,
      energia: d.energia,
      skillRequerido: d.skillRequerido,
      nivelMinimo: d.nivelMinimo,
      banderas: [...d.banderas],
      atributos: { ...d.atributos },
      fx: d.fx,
      sonido: d.sonido,
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: HechizoDto): Hechizo {
    return Hechizo.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      descripcion: String(d.descripcion ?? ""),
      palabrasMagicas: String(d.palabrasMagicas ?? ""),
      tipo: esTipoDeHechizoValido(d.tipo) ? d.tipo : "dano",
      objetivo: esObjetivoValido(d.objetivo) ? d.objetivo : "ambos",
      mana: Number(d.mana) || 0,
      energia: Number(d.energia) || 0,
      skillRequerido: Number(d.skillRequerido) || 0,
      nivelMinimo: Number(d.nivelMinimo) || 0,
      banderas: Array.isArray(d.banderas) ? d.banderas.map(String) : [],
      atributos: d.atributos ?? {},
      fx: Number(d.fx) || 0,
      sonido: String(d.sonido ?? ""),
      esEjemplo: !!d.esEjemplo,
    });
  },
};
