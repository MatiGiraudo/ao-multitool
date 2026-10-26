import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Problema } from "@/compartido/dominio/Problema";
import type { Efecto } from "./Efecto";

/** Servicio de dominio: lo que no se puede chequear mirando un solo efecto. */
export const ValidadorDeEfectos = {
  problemas(efecto: Efecto, todos: readonly Efecto[], catalogo: CatalogoGrafico): Problema[] {
    const out: Problema[] = [];
    if (todos.some((e) => e !== efecto && e.clave !== efecto.clave && e.numero === efecto.numero))
      out.push({ gravedad: "error", mensaje: "ID repetido" });
    if (efecto.referenciasVigentes().some((r) => !catalogo.resolver(r))) out.push({ gravedad: "error", mensaje: "Vínculo roto" });
    if (!efecto.nombre.trim()) out.push({ gravedad: "aviso", mensaje: "Sin nombre" });
    if (!efecto.animacion) out.push({ gravedad: "aviso", mensaje: "Sin animación" });
    return out;
  },
};
