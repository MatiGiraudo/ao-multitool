import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import type { Cabeza } from "./Cabeza";
import type { Cuerpo } from "./Cuerpo";

/** Puertos de persistencia del módulo: una colección por especie. */
export type CuerpoRepositorio = ColeccionRepositorio<Cuerpo>;
export type CabezaRepositorio = ColeccionRepositorio<Cabeza>;
