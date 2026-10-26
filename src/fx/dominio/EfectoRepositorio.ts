import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import type { Efecto } from "./Efecto";

/** Puerto de persistencia de los efectos. */
export type EfectoRepositorio = ColeccionRepositorio<Efecto>;
