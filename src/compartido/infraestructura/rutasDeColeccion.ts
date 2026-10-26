import "server-only";
import type { DtoDeColeccion, MapeadorDeColeccion } from "./coleccion";
import { responder, sinContenido } from "./respuestas";

/*
 * Adaptadores de ENTRADA genéricos: traducen HTTP a casos de uso para una colección.
 * Cada módulo nuevo pone dos archivos de API de tres líneas en lugar de copiar estos handlers.
 */

/**
 * Next entrega los parámetros de la ruta como promesa. El tipo se escribe a mano, en lugar de usar
 * el helper global `RouteContext<"/api/…">`, para que `npm run typecheck` ande sin haber corrido
 * antes el dev o el build que generan los tipos de las rutas.
 */
export interface ContextoDeClave {
  params: Promise<{ clave: string }>;
}

/** Handlers de `/api/<recurso>`: listar todo, y guardar varios de una vez (lo usa la importación). */
export function rutasDeLaColeccion<T, D extends DtoDeColeccion>(casos: {
  mapeador: MapeadorDeColeccion<T, D>;
  listar(): Promise<T[]>;
  guardarVarios(items: readonly T[]): Promise<void>;
  /** En plural y en minúscula, para el mensaje de error: "Se esperaba una lista de objetos.". */
  plural: string;
}) {
  return {
    GET: () => responder(async () => Response.json((await casos.listar()).map((i) => casos.mapeador.aDto(i)))),

    POST: (req: Request) =>
      responder(async () => {
        const dtos = (await req.json()) as D[];
        if (!Array.isArray(dtos)) return Response.json({ error: `Se esperaba una lista de ${casos.plural}.` }, { status: 400 });
        await casos.guardarVarios(dtos.map((d) => casos.mapeador.aDominio(d)));
        return sinContenido();
      }),
  };
}

/** Handlers de `/api/<recurso>/[clave]`: guardar uno y borrarlo. */
export function rutasDeUnItem<T, D extends DtoDeColeccion>(casos: {
  mapeador: MapeadorDeColeccion<T, D>;
  guardar(item: T): Promise<void>;
  eliminar(clave: string): Promise<void>;
}) {
  return {
    PUT: (req: Request, { params }: ContextoDeClave) =>
      responder(async () => {
        const { clave } = await params;
        const dto = (await req.json()) as D;
        if (dto.clave !== clave) return Response.json({ error: "La clave de la URL no coincide con la del cuerpo." }, { status: 400 });
        await casos.guardar(casos.mapeador.aDominio(dto));
        return sinContenido();
      }),

    DELETE: (_req: Request, { params }: ContextoDeClave) =>
      responder(async () => {
        await casos.eliminar((await params).clave);
        return sinContenido();
      }),
  };
}
