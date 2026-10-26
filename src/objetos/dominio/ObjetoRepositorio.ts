import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import type { Objeto } from "./Objeto";

/**
 * Puerto de persistencia de objetos. Es una colección como cualquier otra del editor, así que
 * reusa la forma compartida; el nombre propio se mantiene porque es el que usan los casos de uso.
 */
export type ObjetoRepositorio = ColeccionRepositorio<Objeto>;
