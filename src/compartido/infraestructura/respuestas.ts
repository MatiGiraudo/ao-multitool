import "server-only";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";

/** Traduce errores a respuestas HTTP: reglas de negocio → 400, el resto → 500. */
export async function responder(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorDeDominio || e instanceof SyntaxError) return Response.json({ error: e.message }, { status: 400 });
    if (e instanceof Error && e.message === "Identificador inválido.") return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export const sinContenido = () => new Response(null, { status: 204 });
