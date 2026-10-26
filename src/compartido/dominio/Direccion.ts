/** Las cuatro direcciones en las que se ve un personaje en AO. */
export type Direccion = "sur" | "norte" | "este" | "oeste";

export interface InfoDireccion {
  valor: Direccion;
  etiqueta: string;
  flecha: string;
  /** Sufijos de nombre de animación que se reconocen al autovincular ("caminar_sur", "walk_down"…). */
  sufijos: RegExp;
}

export const DIRECCIONES: readonly InfoDireccion[] = [
  { valor: "sur", etiqueta: "Sur", flecha: "↓", sufijos: /(^|[_\-\s.])(sur|s|south|abajo|down|frente)$/i },
  { valor: "norte", etiqueta: "Norte", flecha: "↑", sufijos: /(^|[_\-\s.])(norte|n|north|arriba|up|espalda)$/i },
  { valor: "este", etiqueta: "Este", flecha: "→", sufijos: /(^|[_\-\s.])(este|e|east|derecha|der|right)$/i },
  { valor: "oeste", etiqueta: "Oeste", flecha: "←", sufijos: /(^|[_\-\s.])(oeste|o|w|west|izquierda|izq|left)$/i },
];
