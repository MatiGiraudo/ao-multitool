import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import type { Hechizo } from "./Hechizo";

/** Puerto de persistencia de los hechizos. */
export type HechizoRepositorio = ColeccionRepositorio<Hechizo>;
