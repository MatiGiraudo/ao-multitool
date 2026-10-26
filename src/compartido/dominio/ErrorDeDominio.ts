/**
 * Error que lanza el dominio cuando se intenta romper una regla del negocio
 * (por ejemplo, un frame con ancho negativo o un objeto con ID 0).
 * La interfaz lo muestra tal cual al usuario, así que el mensaje va en castellano y claro.
 */
export class ErrorDeDominio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeDominio";
  }
}

export function asegurar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new ErrorDeDominio(mensaje);
}
