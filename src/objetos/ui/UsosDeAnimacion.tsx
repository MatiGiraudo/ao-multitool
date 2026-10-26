"use client";
import type { Animacion } from "@/graficos/dominio/Animacion";
import { useObjetos } from "./ProveedorDeObjetos";

/** Línea "Usada por: …" que la pestaña Animaciones muestra sin conocer al módulo Objetos. */
export function UsosDeAnimacion({ animacion }: { animacion: Animacion }) {
  const { objetos, catalogo } = useObjetos();
  const usan = objetos.filter((o) => o.referenciasVigentes().some((r) => catalogo.resolver(r)?.animacionId === animacion.id));
  return <p className="hint">{usan.length ? `Usada por: ${usan.map((o) => o.nombre).join(", ")}` : "Ningún objeto usa esta animación todavía."}</p>;
}
