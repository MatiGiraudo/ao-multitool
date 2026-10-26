import type { Metadata } from "next";
import { EditorDeObjetos } from "@/objetos/ui/EditorDeObjetos";

export const metadata: Metadata = { title: "Objetos · AO World Editor" };

export default function Pagina() {
  return <EditorDeObjetos />;
}
