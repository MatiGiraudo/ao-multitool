"use client";
import type { ReactNode } from "react";
import type { DefinicionDeAtributo, DefinicionDeBandera, ValorDeAtributo } from "@/compartido/dominio/Atributos";

/*
 * La contracara en pantalla de los atributos declarados por tipo: cada definición se dibuja sola,
 * según su clase. Lo usan la ficha de objeto y la de hechizo, y lo va a usar la de NPC.
 *
 * Que un tipo nuevo no necesite tocar la interfaz es la mitad de lo que vale declarar los
 * atributos como dato; esta es la otra mitad.
 */

export function CamposDeAtributos(p: {
  idPrefijo: string;
  definiciones: readonly DefinicionDeAtributo[];
  valores: Readonly<Record<string, ValorDeAtributo>>;
  /** `null` borra el atributo. */
  onCambiar(clave: string, valor: string | null): void;
}) {
  if (!p.definiciones.length) return null;
  return (
    <div className="form-grid">
      {p.definiciones.map((a) => (
        <label key={a.clave} className="f">
          {a.etiqueta}
          {a.clase === "opcion" ? (
            <select id={`${p.idPrefijo}_${a.clave}`} value={String(p.valores[a.clave] ?? "")} onChange={(e) => p.onCambiar(a.clave, e.target.value || null)}>
              <option value="">—</option>
              {a.opciones?.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${p.idPrefijo}_${a.clave}`}
              type={a.clase === "numero" ? "number" : "text"}
              value={p.valores[a.clave] ?? ""}
              onChange={(e) => p.onCambiar(a.clave, e.target.value === "" ? null : e.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}

export function CasillasDeBanderas(p: {
  idPrefijo: string;
  definiciones: readonly DefinicionDeBandera[];
  activa(clave: string): boolean;
  onCambiar(clave: string, activa: boolean): void;
  /** Casillas propias de la ficha que van antes de las banderas (por ejemplo "Apilable"). */
  children?: ReactNode;
}) {
  return (
    <div className="flags">
      {p.children}
      {p.definiciones.map((b) => (
        <label key={b.clave}>
          <input id={`${p.idPrefijo}_${b.clave}`} type="checkbox" checked={p.activa(b.clave)} onChange={(e) => p.onCambiar(b.clave, e.target.checked)} /> {b.etiqueta}
        </label>
      ))}
    </div>
  );
}
