"use client";
import type { CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";

/**
 * Elegir otra entidad por su número de AO: el cuerpo de un NPC, el objeto que suelta, el hechizo
 * que lanza. Es la cara visible de `CatalogoPorNumero`, y por eso sirve para cualquier familia.
 *
 * Dos cuidados que no son obvios:
 *
 * - **Nunca pierde el valor que ya estaba.** Si el número no está en el catálogo —porque importaste
 *   NPCs antes que las apariencias, por ejemplo— aparece igual, marcado como que no existe, en vez
 *   de volverse silenciosamente "ninguno". El validador ya avisa; borrarlo sería peor.
 * - El catálogo vacío no se esconde: se ve que no hay de dónde elegir todavía.
 */
export function SelectorPorNumero(p: {
  id: string;
  etiqueta?: string;
  catalogo: CatalogoPorNumero;
  /** 0 = ninguno. */
  valor: number;
  vacio?: string;
  onCambiar(numero: number): void;
  className?: string;
}) {
  const opciones = p.catalogo.todos();
  const estaEnElCatalogo = p.valor === 0 || opciones.some((o) => o.numero === p.valor);

  const select = (
    <select id={p.id} className={p.className} value={String(p.valor)} onChange={(e) => p.onCambiar(Number(e.target.value) || 0)}>
      <option value="0">{p.vacio ?? "— ninguno —"}</option>
      {!estaEnElCatalogo && <option value={String(p.valor)}>#{p.valor} (no existe)</option>}
      {opciones.map((o) => (
        <option key={o.numero} value={String(o.numero)}>
          #{o.numero} {o.nombre || "(sin nombre)"}
        </option>
      ))}
    </select>
  );

  if (!p.etiqueta) return select;
  return (
    <label className="f" htmlFor={p.id}>
      {p.etiqueta}
      {select}
    </label>
  );
}
