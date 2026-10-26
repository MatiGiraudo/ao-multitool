import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";

/** Adaptador real del puerto GeneradorDeIds: UUID v4 cortos y legibles en nombres de archivo. */
export class GeneradorDeIdsAleatorio implements GeneradorDeIds {
  nuevo(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
}

/** Adaptador para tests: ids secuenciales y predecibles. */
export class GeneradorDeIdsSecuencial implements GeneradorDeIds {
  private n = 0;
  constructor(private readonly prefijo = "id") {}
  nuevo(): string {
    this.n += 1;
    return `${this.prefijo}-${this.n}`;
  }
}
