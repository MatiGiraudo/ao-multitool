import { Autovinculador } from "@/compartido/dominio/Autovinculador";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { DIRECCIONES } from "@/compartido/dominio/Direccion";
import type { Problema } from "@/compartido/dominio/Problema";
import type { Objeto } from "./Objeto";

/*
 * Servicio de dominio: reglas que involucran a más de un objeto (o a un objeto y al catálogo),
 * así que no le pertenecen a la entidad.
 *
 * El autovínculo por dirección y el tipo Problema viven en `compartido/dominio`: los comparten
 * todos los módulos que vinculan gráficos.
 */
export const ValidadorDeObjetos = {
  problemas(objeto: Objeto, todos: readonly Objeto[], catalogo: CatalogoGrafico): Problema[] {
    const out: Problema[] = [];
    if (todos.some((o) => o !== objeto && o.clave !== objeto.clave && o.numero === objeto.numero))
      out.push({ gravedad: "error", mensaje: "ID repetido" });
    if (objeto.referenciasVigentes().some((r) => !catalogo.resolver(r))) out.push({ gravedad: "error", mensaje: "Vínculo roto" });
    if (!objeto.nombre.trim()) out.push({ gravedad: "aviso", mensaje: "Sin nombre" });
    if (!objeto.graficos.icono) out.push({ gravedad: "aviso", mensaje: "Sin icono" });
    if (objeto.tipo.equipable) {
      const faltan = DIRECCIONES.filter((d) => !objeto.graficos.equipado[d.valor]).length;
      if (faltan) out.push({ gravedad: "aviso", mensaje: faltan === 4 ? "Sin equipado" : `Faltan ${faltan} dir.` });
    }
    return out;
  },
};

/**
 * Autovínculo del equipado. El `Autovinculador` compartido sabe qué animación va en cada dirección,
 * pero no sabe dónde las guarda un objeto: eso lo dice el `conEquipado` de acá.
 */
export function autovincularEquipado(objeto: Objeto, hojaId: string, catalogo: CatalogoGrafico): { objeto: Objeto; cantidad: number } {
  const { entidad, cantidad } = Autovinculador.vincular(objeto, hojaId, catalogo, (o, direccion, referencia) => o.conEquipado(direccion, referencia));
  return { objeto: entidad, cantidad };
}
