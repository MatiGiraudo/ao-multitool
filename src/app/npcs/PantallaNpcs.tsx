"use client";
import { useMemo } from "react";
import { catalogoDe } from "@/compartido/dominio/CatalogoPorNumero";
import { useApariencias } from "@/apariencias/ui/ProveedorDeApariencias";
import { VistaPreviaDePersonaje } from "@/apariencias/ui/VistaPreviaDePersonaje";
import { useHechizos } from "@/hechizos/ui/ProveedorDeHechizos";
import { EditorDeNpcs } from "@/npcs/ui/EditorDeNpcs";
import { ProveedorDeNpcs } from "@/npcs/ui/ProveedorDeNpcs";
import { useObjetos } from "@/objetos/ui/ProveedorDeObjetos";

/**
 * Composición: NPCs no conoce a ningún otro módulo, pero la página los junta.
 *
 * De acá salen los cuatro catálogos que el NPC apunta por número y la vista previa del personaje
 * armado, que es del módulo Apariencias.
 */
export function PantallaNpcs() {
  const apariencias = useApariencias();
  const { objetos } = useObjetos();
  const { hechizos } = useHechizos();

  const catalogos = useMemo(
    () => ({
      cuerpos: catalogoDe(apariencias.cuerpos.items.map((c) => ({ numero: c.numero, nombre: c.nombre }))),
      cabezas: catalogoDe(apariencias.cabezas.items.map((c) => ({ numero: c.numero, nombre: c.nombre }))),
      objetos: catalogoDe(objetos.map((o) => ({ numero: o.numero, nombre: o.nombre }))),
      hechizos: catalogoDe(hechizos.map((h) => ({ numero: h.numero, nombre: h.nombre }))),
    }),
    [apariencias.cuerpos.items, apariencias.cabezas.items, objetos, hechizos],
  );

  return (
    <ProveedorDeNpcs catalogos={catalogos}>
      <EditorDeNpcs renderApariencia={(cuerpo, cabeza) => <AparienciaDelNpc cuerpo={cuerpo} cabeza={cabeza} />} />
    </ProveedorDeNpcs>
  );
}

/** El cuerpo y la cabeza del NPC, buscados por número, dibujados con la vista previa de Apariencias. */
function AparienciaDelNpc({ cuerpo, cabeza }: { cuerpo: number; cabeza: number }) {
  const apariencias = useApariencias();
  return (
    <VistaPreviaDePersonaje
      cuerpo={apariencias.cuerpos.items.find((c) => c.numero === cuerpo)}
      cabeza={apariencias.cabezas.items.find((c) => c.numero === cabeza)}
    />
  );
}
