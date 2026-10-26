import { HttpColeccionRepositorio } from "@/compartido/infraestructura/navegador/HttpColeccionRepositorio";
import type { Hechizo } from "../../dominio/Hechizo";
import type { HechizoRepositorio } from "../../dominio/HechizoRepositorio";
import { HechizoMapper, type HechizoDto } from "../HechizoDto";

export class HttpHechizoRepositorio extends HttpColeccionRepositorio<Hechizo, HechizoDto> implements HechizoRepositorio {
  constructor(base = "/api/hechizos") {
    super(base, HechizoMapper, (h) => h.clave);
  }
}
