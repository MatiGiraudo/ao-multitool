"use client";
import { EditorDeHojas } from "@/graficos/ui/EditorDeHojas";
import { UsosDeAnimacion } from "@/objetos/ui/UsosDeAnimacion";

/** Composición: Gráficos no conoce a Objetos, pero la página puede juntarlos. */
export function PantallaAnimaciones() {
  return <EditorDeHojas renderUso={(_hoja, animacion) => <UsosDeAnimacion animacion={animacion} />} />;
}
