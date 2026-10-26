"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonImportarProyecto } from "@/proyecto/ui/BotonImportarProyecto";
import { seccionDe, seccionesPorFamilia } from "./secciones";

export function Encabezado() {
  const ruta = usePathname();
  const actual = seccionDe(ruta);
  return (
    <header className="top">
      <h1>AO World Editor</h1>
      {seccionesPorFamilia().map(({ familia, secciones }) => (
        <nav key={familia} className="seg tabs" aria-label={`Secciones de ${familia}`}>
          {secciones.map((s) => (
            <Link key={s.href} href={s.href} aria-current={s === actual ? "page" : undefined}>
              {s.nombre}
            </Link>
          ))}
        </nav>
      ))}
      <span className="sub">{actual.sub}</span>
      <BotonImportarProyecto />
    </header>
  );
}
