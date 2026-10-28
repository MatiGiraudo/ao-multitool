import { TablaDeGrh, type Grh } from "../dominio/TablaDeGrh";

/** Forma plana de la tabla. Es un archivo grande, así que se guarda sin indentar de más. */
export interface TablaDeGrhDto {
  formato: "ao-grh";
  version: 1;
  grhs: Grh[];
}

export const TablaDeGrhMapper = {
  aDto(t: TablaDeGrh): TablaDeGrhDto {
    return { formato: "ao-grh", version: 1, grhs: t.datos() };
  },
  aDominio(d: TablaDeGrhDto | null | undefined): TablaDeGrh | null {
    if (!d || !Array.isArray(d.grhs)) return null;
    return TablaDeGrh.desde(
      d.grhs
        .filter((g) => Number.isInteger(Number(g?.numero)) && Number(g.numero) > 0)
        .map((g) => ({
          numero: Number(g.numero),
          archivo: String(g.archivo ?? ""),
          x: Number(g.x) || 0,
          y: Number(g.y) || 0,
          ancho: Number(g.ancho) || 0,
          alto: Number(g.alto) || 0,
          cuadros: Array.isArray(g.cuadros) ? g.cuadros.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [],
          msDelCiclo: Number(g.msDelCiclo) || 0,
          // Sin esto, el gráfico propio sobrevive a guardarse pero no a volver a leerse: pasaría
          // por uno del clásico y la próxima importación se lo llevaría igual.
          ...(g.propio ? { propio: true } : {}),
        })),
    );
  },
};
