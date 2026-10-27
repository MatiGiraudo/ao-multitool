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
