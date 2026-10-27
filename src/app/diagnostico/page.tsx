import type { Metadata } from "next";
import { PantallaDiagnostico } from "@/proyecto/ui/PantallaDiagnostico";

export const metadata: Metadata = { title: "Diagnóstico · AO World Editor" };

export default function Pagina() {
  return <PantallaDiagnostico />;
}
