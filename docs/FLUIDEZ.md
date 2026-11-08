# Fluidez: qué frena al editor hoy

Medido el 26/10/2026 contra los datos reales del proyecto (3.629 hojas, 2.844 vinculadas al `Graficos.ini`,
1.239 objetos, 694 cuerpos, 514 cabezas), usando la app en `npm run dev`.

El concepto del editor está bien y la arquitectura aguanta: **nada de lo que sigue pide tocar el dominio**.
Lo que falta es que la herramienta se deje usar sin fricción. Va ordenado por cuánto molesta, no por cuánto
cuesta arreglarlo.

> **La tanda 1 está hecha** (26/10/2026). Listar las hojas pasó de 5,3 s a 1,7 s y cambiar de pestaña, de
> esos segundos a menos de 800 ms; el primer clic en una hoja sin animaciones ahora crea la animación;
> hay deshacer y rehacer; y la rueda hace zoom. El detalle está al pie de cada punto.

---

## 1. Cada pestaña espera cinco segundos por las hojas ✅ hecho

Lo medido en el navegador, con el proyecto cargado:

| Pedido | Tamaño | Tiempo |
|---|---|---|
| `GET /api/hojas` | 2.021 KB | 5,3 s |
| `GET /api/importacion/grh` | 3.158 KB | 0,1 s |
| `GET /api/objetos` | — | 0,3 s |

`/api/hojas` se pide al montar `ProveedorDeGraficos`, y **cinco de las seis pestañas lo montan**
(animaciones, apariencias, objetos, FX, hechizos). Como cada página compone sus proveedores, cambiar de
pestaña desmonta y vuelve a pedir todo: son cinco segundos cada vez. En desarrollo el efecto doble de
React lo pide dos veces, así que en la práctica se sienten diez.

Son tres causas distintas y se arreglan por separado:

- **Se leen 3.629 archivos en serie.** `ArchivosHojaRepositorio.listar()` hace `for` con `await` adentro:
  un `readFile` por vez. Leerlos en tandas de a 50 con `Promise.all` es el arreglo más barato de toda
  esta lista y se lleva la mayor parte de los 5 s.
- **Se manda la hoja entera.** El listado devuelve cada hoja con todas sus animaciones y frames, cuando
  la tira de hojas sólo usa nombre, tamaño y cuántas animaciones tiene. Un catálogo liviano (y la ficha
  completa sólo de la hoja abierta) achica el JSON a una fracción.
- **No hay caché.** El editor es local y de un solo usuario: el servidor puede quedarse con la lista en
  memoria e invalidarla al guardar, y el cliente puede no volver a pedirla al cambiar de pestaña.

La pantalla de importar tiene su versión del mismo problema: se baja los 3,1 MB de `grh.json` al navegador
para contar cuántas hojas faltan. Esa cuenta es del servidor.

## 2. En una hoja sin animaciones, el lienzo no responde ✅ hecho

Es el peor de los problemas de flujo, porque pasa en la hoja recién cargada: hacés clic en la imagen y no
pasa nada. Ni un frame, ni un aviso. Mientras tanto el panel de al lado dice, textual, *«Todavía no hay
frames. Hacé clic en las celdas de la hoja, en el orden del ciclo.»*

La causa es una línea: `LienzoDeHoja` ignora el clic si no hay animación elegida, y una hoja recién creada
por el cargador masivo **nace sin animaciones** (fue una decisión deliberada: miles de `animacion_1` vacías
serían ruido en todos los selectores). O sea que es el estado normal de las 3.629 hojas del proyecto.

El arreglo que menos pide al usuario: **que el primer clic cree la animación**. Si no hay ninguna, el clic
crea una y le pone el primer frame, igual que hace «+ Nueva» pero sin obligar a descubrirlo. Mientras tanto,
el texto del panel vacío debería decir la verdad («Creá una animación para empezar a marcar frames»).

## 3. La tira de hojas se come la pantalla y no escala a miles

La tira ocupa **el 25 % del alto a 1440×900 y más de la mitad a 800 px**, siempre, aunque estés trabajando
en una sola hoja. El lienzo —lo único que venís a usar— queda abajo y chico.

Y elegir entre 3.629 hojas es escribir a ciegas en «Filtrar por nombre…»: no hay orden, no hay recientes,
no se ve cuáles ya tienen animaciones y cuáles no. El tope de 60 que agregamos evita que la página se
cuelgue, pero no ayuda a encontrar nada.

Lo que corresponde a esta escala es un **panel lateral angosto**: buscador arriba (con atajo de teclado),
lista vertical virtualizada, filtros que respondan a la pregunta real («sin animaciones», «con
animaciones», «usada por objetos»), y las últimas abiertas a mano. El lienzo se queda con todo el alto.

## 4. No hay deshacer ✅ hecho

Un clic de más agrega un frame y hay que ir a borrarlo; arrastrar sin querer mueve un recorte y hay que
acomodarlo a ojo. Es lo primero que uno intenta en un editor y hoy no está.

El dominio ya está preparado —`Animacion` es inmutable y el comentario de su archivo lo dice: *«deshacer/
rehacer sea trivial más adelante»*—. Alcanza con una pila de estados de la hoja abierta y `Ctrl+Z` /
`Ctrl+Shift+Z`.

## 5. El lienzo no se maneja como un editor de pixel art

Faltan los gestos que uno ya tiene en los dedos:

- ✅ **Zoom con la rueda**, centrado en el cursor (con `Shift` sigue desplazando). Antes el zoom eran dos botones
  `−` / `+` arriba a la derecha, lejos de donde está la mano.
- **Desplazar con espacio o con el botón del medio.** Hoy se desplaza con las barras del contenedor.
- **Ajustar a la ventana** / volver a 1:1 de un golpe.
- El frame que está sonando en la vista previa se resalta en la lista, pero **no en el lienzo**: ver cuál
  recorte es el que parpadea sería gratis y ayuda a encontrar el frame equivocado.

## 6. La grilla hay que adivinarla a mano

Seis campos numéricos (ancho, alto, dos offsets, dos separaciones) que hay que acertar mirando la imagen.
Tres cosas lo arreglan, de menor a mayor esfuerzo:

- **Presets** (32×32, 32×48, 64×64) y recordar la última grilla usada: la mayoría de las hojas de un
  mismo juego comparten medida.
- **Detectar la grilla**: buscar las franjas de píxeles transparentes y proponer celda y separación.
- **Traer los recortes del GRH.** Para las hojas que vienen del cliente clásico esto ni siquiera hay que
  adivinarlo: `grh.json` ya tiene `x`, `y`, `ancho` y `alto` de cada gráfico, por archivo. Un botón
  «traer los recortes de esta hoja» convierte la hoja en frames exactos sin tocar la grilla.

## 7. Detalles de la ficha de animación

- Las animaciones nuevas se llaman `animacion_1`, `animacion_2`… y el nombre es lo que se exporta. El aviso
  de nombres repetidos aparece recién cuando ya están repetidos.
- Los frames se reordenan con `↑` y `↓`, de a uno. Arrastrarlos es lo esperable en una tira de frames.
- Cada frame tiene cuatro campos numéricos (x, y, w, h) más la duración: mucha chatarra visual para algo
  que casi siempre se ajusta arrastrando en el lienzo.
- «Invertir» y «Ida y vuelta» están bien escondidos y son justo las dos cosas que ahorran más clics.

## 8. Las listas largas se dibujan enteras

La pantalla de objetos arma **1.239 fichas con su canvas** de una sola vez; la de apariencias, 694 cuerpos
(y 700 canvas en el DOM). Hoy aguanta, pero es el mismo problema que la tira de hojas y conviene resolverlo
una vez, con un componente de lista virtualizada compartido, antes de que NPCs y Mapas sumen los suyos.

## 9. Lo que la app sabe pero no cuenta

- Los atajos de teclado existen (`G`, `R`, `V`, flechas, `Ctrl+A`, `Supr`) y están explicados en un párrafo
  al pie del panel de frames, que es el último lugar donde uno mira.
- Los tres modos —Grilla, Recuadro libre, Mover— no dicen para qué sirve cada uno hasta que lo elegís.
- El editor sabe que faltan 7 hojas de las 2.851 que pide el `Graficos.ini`, pero eso sólo se ve entrando a
  Importar. Lo mismo con los 433 objetos sin gráfico de equipado: son datos que deberían estar donde se
  trabaja, no escondidos en otra pestaña. (Es, en chiquito, el «Diagnóstico del mundo» de la Fase 6.)

## 10. Cada visita empezaba volviendo a buscar los mismos archivos ✅ hecho

El editor lee archivos de otro programa —la carpeta `Graficos` del cliente, los siete archivos del paso
a paso de Importar, la carpeta `Mundos`— y no los copia, así que cada pestaña que se abría arrancaba
igual: selector del sistema y cuatro carpetas de ida para llegar a la misma de siempre. En una
instalación del clásico eso son más clics que el trabajo que venías a hacer, y en Importar se paga
siete veces, justo en la pantalla que ya era el punto de fricción del editor.

La carpeta del proyecto ya se recordaba desde que existe el modo carpeta (`CarpetaDelProyecto`), y el
resto no, por nada en particular. Ahora lo hacen todas, con la misma pieza:
`HandleRecordado` guarda el handle en el mismo IndexedDB (`handlesGuardados.ts`) y
`BotonArchivoRecordado` / `BotonCarpetaRecordada` dibujan los dos botones que salen de eso —«Volver a
leer «Personajes.ini»» y «Elegir otro…»— en lugar del `<input type=file>` de antes.

Tres decisiones que valen la pena:

- **Se guarda el handle, no la ruta.** No es una elección: el navegador no abre nada por ruta, y un
  texto con `C:AOINITPersonajes.ini` no serviría para leer nada. Es a propósito de la API.
- **El archivo se relee del disco cada vez**, en vez de quedarse con el `File` de la primera. Es justo
  el caso que hace útil recordarlo —lo editás afuera y volvés a importar—, así que entregar la versión
  vieja hubiera sido peor que no recordar nada.
- **Modo lectura**, y no `readwrite` como la carpeta del proyecto. El editor nunca escribe en los
  archivos del juego: lo que devuelve sale por «Exportar». Pedir escritura sobre la carpeta del cliente
  es pedir de más, y el navegador lo cuenta con un cartel más serio.

Lo que no se puede evitar es el permiso: el navegador lo pide de nuevo en cada sesión y sólo puede
pedirlo desde un clic, así que el primer clic de cada paso puede abrir ese cartel en vez de leer. De
ahí que `recuperar()` distinga «está, pero falta el permiso» de «no hay nada»: con lo primero se
ofrece un clic, con lo segundo un selector. En Firefox y Safari, que no tienen la API, los botones
caen al `<input>` de antes: se pierde la comodidad, no la función.

## 11. El clic que no hacía nada ✅ hecho el 8/11/2026

«Elijo la carpeta de mundos y no me la carga ni me da ningún error.» Tres caminos distintos
terminaban en la misma pantalla muda, y los tres se daban en el peor momento: volviendo del selector
del sistema, que es justo cuando el aviso de arriba ya se borró.

- **El selector se cierra sin entregar nada.** Chrome tira el mismo `AbortError` si cancelaste, si
  se negó a entregar la carpeta —tiene una lista que no entrega: `Program Files`, `Windows`, la
  raíz de `C:`, y una instalación del AO suele estar adentro de una— y si el permiso del sitio
  está bloqueado, que ni siquiera abre el cuadro. Lo documenta MDN y lo confirma el bug de Electron
  42459: nada en el error los distingue, y la negativa no llega a pasar por los permisos. **Pero el
  reloj sí los distingue.** Cancelar es ver el cuadro, mirarlo y cerrarlo, y eso no baja del medio
  segundo; una negativa vuelve en lo que tarda una llamada que no hizo nada. Así que se mide: menos
  de 250 ms es «no se abrió nunca» y manda al permiso del sitio, y más es «lo cerraste vos» y
  pregunta dónde está la carpeta. Son dos consejos opuestos y antes no se daba ninguno.
- **Un archivo que el disco no entrega.** Los `getFile()` iban en tandas de 50 con `Promise.all`,
  así que uno solo —tomado por otro programa, borrado entre que se listó y se fue a leer— rechazaba
  su tanda entera y la carpeta terminaba contada como perdida: «esa carpeta ya no está donde
  estaba», se olvidaba el handle y de vuelta al selector, con los otros trescientos mapas ahí al
  lado. Ahora se saltea lo que no se deja leer. La raíz es la excepción a propósito: si la carpeta
  que elegiste no abre, no hay nada que abrir y eso sí hay que decirlo.
- **La lista vacía se la guardaba el botón.** `BotonCarpetaRecordada` cortaba antes de entregarla,
  así que el cartel que la pantalla de mapas tenía escrito para ese caso —«miré N archivos y no hay
  ningún `.map` con su `.inf` al lado»— no se mostraba nunca. Ahora entrega siempre: cuántos
  archivos había y qué se esperaba encontrar lo sabe quien pidió, no el botón, que no tiene idea de
  si buscaba mapas o imágenes.

Lo que queda para la próxima: un camino que termina sin hacer nada tiene que dejar algo escrito
**donde se hizo el clic**. El aviso de arriba dura 3,2 segundos y estas cosas pasan mientras el
usuario está mirando el selector del sistema.

---

## Por dónde conviene ir

**Tanda 1 — que no duela (medio día). ✅ Hecha el 26/10/2026.** Paralelizar la lectura de hojas, recordar la
lista entre pantallas, primer clic que crea la animación, `Ctrl+Z`, zoom con la rueda. Medido después:
listar las hojas 1,7 s (era 5,3 s) y cambiar de pestaña entre 110 y 780 ms (eran 5 a 11 s), porque lo
recordado se muestra al instante y la relectura va por atrás.

**Tanda 2 — elegir hoja sin sufrir (1 día).** La tira pasa a panel lateral con buscador, filtros,
virtualización y recientes. El mismo componente de lista le sirve después a objetos, apariencias y NPCs.

**Tanda 3 — menos trabajo manual (1 día).** Detectar la grilla y traer los recortes del GRH, arrastrar
frames, atajos a la vista, y los contadores de «qué me falta» donde se trabaja.

Después de eso, Fase 4 (NPCs) arranca sobre una herramienta que ya es cómoda, que es justo lo que conviene:
NPCs es la pantalla con más campos de todas y va a heredar cada una de estas decisiones.
