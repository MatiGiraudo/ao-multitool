"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonImportarProyecto } from "@/proyecto/ui/BotonImportarProyecto";

const SECCIONES = [
  { href: "/animaciones", nombre: "Animaciones", sub: "Cargá hojas de sprites, marcá los frames en orden y exportá cada ciclo como JSON." },
  { href: "/objetos", nombre: "Objetos", sub: "Creá los objetos del juego y vinculá su icono, gráfico en el suelo y animaciones de equipado." },
];

export function Encabezado() {
  const ruta = usePathname();
  const actual = SECCIONES.find((s) => ruta?.startsWith(s.href)) ?? SECCIONES[0]!;
  return (
    <header className="top">
      <h1>AO World Editor</h1>
      <nav className="seg tabs" aria-label="Secciones">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} aria-current={s === actual ? "page" : undefined}>
            {s.nombre}
          </Link>
        ))}
      </nav>
      <span className="sub">{actual.sub}</span>
      <BotonImportarProyecto />
    </header>
  );
}
