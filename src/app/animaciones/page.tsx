import type { Metadata } from "next";
import { PantallaAnimaciones } from "./PantallaAnimaciones";

export const metadata: Metadata = { title: "Animaciones · AO World Editor" };

export default function Pagina() {
  return <PantallaAnimaciones />;
}
