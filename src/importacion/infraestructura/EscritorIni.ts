/*
 * Reescribir una sección de un archivo del clásico sin perder lo que el editor no entiende.
 *
 * Es la pieza que hace honesto el ida y vuelta. De las 90 claves de un `OBJ.dat` el editor maneja
 * unas veinte; las otras setenta —ropaje, sonidos, clases prohibidas, requisitos de herrería— no
 * están en el dominio y no hay de dónde volver a sacarlas. Así que no se regeneran: se dejan tal
 * como vinieron, y se tocan únicamente las líneas de las claves que el editor sí maneja.
 *
 * Se conserva todo lo demás de la línea original: el orden, las mayúsculas de la clave, los
 * comentarios sueltos y hasta el espaciado raro. Un archivo importado y exportado sin editar nada
 * vuelve a salir idéntico.
 */

/**
 * Lo que el editor quiere dejar escrito en una sección.
 *
 * Una clave que ya estaba en el archivo se reescribe con el valor que venga, aunque sea 0 o vacío:
 * si el original decía `MinDef=0`, sacarle la línea sería cambiar el archivo sin que nadie lo
 * haya pedido, y si el usuario puso el valor en 0 hay que escribirlo. Una clave que NO estaba se
 * agrega sólo si tiene algo que decir, para no llenar de ceros los objetos que no los traían.
 *
 * `null` es «esta no la toco»: la línea original queda como está. Es lo que corresponde cuando el
 * editor no entiende el valor —una `TipoPocion=6` que no está en su lista— porque borrarla sería
 * perder algo que el servidor sí usa.
 */
export type ValorPropio = string | number | null;

/**
 * El valor puede ser una función del que ya estaba, para los casos en que el archivo dice lo
 * mismo de otra forma: un `NeedStaff=2` es tan «sí» como un `NeedStaff=1`, y pisarlo con 1 sería
 * cambiar el archivo sin motivo.
 */
export type ClavesPropias = Record<string, ValorPropio | ((original: string | undefined) => ValorPropio)>;

/**
 * Una bandera que ya estaba prendida se deja como estaba.
 *
 * El clásico escribe «sí» de varias formas —hay un `NeedStaff=2` en el `Hechizos.dat` de Alkon—
 * y el editor sólo sabe si está prendida o no. Reemplazarlo por un 1 sería cambiar el archivo sin
 * que nadie lo haya pedido.
 */
export function siPrendida(prendida: boolean) {
  return (original: string | undefined): ValorPropio => {
    if (!prendida) return 0;
    const estaba = (original ?? "").trim();
    return estaba && estaba !== "0" ? null : 1;
  };
}

/**
 * Una clave que no estaba en el archivo y sigue valiendo lo de siempre no se agrega.
 *
 * Lo que el editor muestra cuando el archivo no dice nada es un valor por defecto, no algo que el
 * usuario haya elegido: un NPC sin `Heading` aparece mirando al sur, y escribirlo sería inventarle
 * una dirección que nadie puso.
 */
export function salvoElDefault(valor: number, porDefecto: number) {
  return (original: string | undefined): ValorPropio => (original === undefined && valor === porDefecto ? null : valor);
}

export function reescribirSeccion(lineasOriginales: readonly string[], propias: ClavesPropias): string[] {
  const pendientes = new Map(Object.entries(propias).map(([clave, valor]) => [clave.toLowerCase(), { clave, valor }]));
  const salida: string[] = [];

  for (const linea of lineasOriginales) {
    const igual = linea.indexOf("=");
    const clave = igual > 0 ? linea.slice(0, igual).trim().toLowerCase() : "";
    const propia = clave ? pendientes.get(clave) : undefined;
    if (!propia) {
      salida.push(linea);
      continue;
    }
    pendientes.delete(clave);
    const anterior = linea.slice(igual + 1).trim();
    const valor = typeof propia.valor === "function" ? propia.valor(anterior) : propia.valor;
    // Si el valor es el mismo, o es «no la toco», la línea queda tal cual: así un archivo
    // exportado sin editar nada sale igual al que entró, con sus espacios de más incluidos, y el
    // diff muestra sólo lo que se tocó.
    if (valor === null || anterior === String(valor)) {
      salida.push(linea);
      continue;
    }
    // La clave se escribe como estaba en el archivo: hay servidores que las leen con mayúsculas.
    salida.push(`${linea.slice(0, igual).trim()}=${valor}`);
  }

  // Lo que el editor agregó y el archivo no tenía va al final de la sección, si dice algo.
  for (const { clave, valor } of pendientes.values()) {
    const v = typeof valor === "function" ? valor(undefined) : valor;
    if (v !== null && v !== "" && v !== 0) salida.push(`${clave}=${v}`);
  }
  return salida;
}

/**
 * Un archivo entero: secciones numeradas, en orden, en el formato que espera el juego.
 *
 * Cada sección llega entera, con su línea `[NOMBRE]` adelante y sus renglones en blanco, tal como
 * estaban. Acá no se agrega ni se saca ninguno: el espaciado del archivo es del archivo, y
 * cambiarlo haría que un `.dat` exportado sin editar nada no coincidiera con el que entró.
 */
export function armarIni(secciones: readonly (readonly string[])[], encabezado: readonly string[] = []): string {
  const partes: string[] = [...encabezado];
  for (const lineas of secciones) partes.push(...lineas);
  // Los archivos del clásico son de Windows: CRLF y un salto al final.
  return partes.join("\r\n") + "\r\n";
}
