"use client";
import { useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo } from "@/compartido/ui/componentes";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { useObjetos } from "@/objetos/ui/ProveedorDeObjetos";

/** Trae el "proyecto-ao.json" del indexador web: hojas con sus imágenes, animaciones y objetos. */
export function BotonImportarProyecto() {
  const { casos, avisar, intentar } = useAplicacion();
  const graficos = useGraficos();
  const objetos = useObjetos();
  const [ocupado, setOcupado] = useState(false);
  return (
    <BotonArchivo
      accept=".json,application/json"
      onArchivo={async (f) => {
        setOcupado(true);
        const r = await intentar(async () => casos.proyecto.importarLegado.ejecutar(await f.text()));
        await graficos.recargar();
        await objetos.recargar();
        setOcupado(false);
        if (r)
          avisar(
            `Proyecto importado: ${r.hojasNuevas} hojas nuevas, ${r.hojasActualizadas} actualizadas, ${r.objetos.agregados + r.objetos.reemplazados} objetos.`,
          );
      }}
    >
      {ocupado ? "Importando…" : "Importar proyecto del indexador web…"}
    </BotonArchivo>
  );
}
