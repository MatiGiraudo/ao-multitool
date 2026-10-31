# Lo que sabemos que está mal

Problemas encontrados y **no** arreglados todavía, con dónde están y qué haría falta. No es una
lista de deseos: cada uno es algo que ya se puede reproducir hoy.

Los que se encuentran revisando una rama y se arreglan en el momento no llegan acá; esto es para
lo que se decidió dejar para después, así no se pierde.

> Revisión del 27/10/2026, sobre la rama `mapas-de-cero`. Los dos hallazgos graves de esa misma
> revisión —guardar un mapa pisaba otro con el mismo número, y elegir dos tiles seguidos se llevaba
> el mismo número de GRH— ya están arreglados en `d925788`.
>
> Segunda revisión del 28/10/2026, sobre la misma rama. El hallazgo grave —reimportar el
> `Graficos.ini` borraba los gráficos propios del proyecto— está arreglado; los otros tres quedaron
> acá.
>
> El 28/10/2026 se arreglaron también los dos del guardado de mapas, que eran los que perdían
> trabajo: el guardado que fallaba en silencio y el automático que se descartaba al cambiar de
> mapa. Con ellos se fue un tercero que apareció al probarlos: reintentar un guardado preguntaba
> si querías pisar el mapa guardado, que era el mismo que estabas editando.
>
> El 28/10/2026, más tarde, salieron de esta lista los dos del peso del editor de mapas: abrir uno
> del proyecto lo volvía a guardar al segundo, y listar los guardados parseaba cada archivo entero.
> El segundo se resolvió leyendo la cabecera de cada archivo, no con un índice aparte: un índice
> hay que mantener al día, y una carpeta donde los mapas pueden aparecer de afuera —de un git pull,
> de otra máquina— lo deja mintiendo sin que nadie se entere.
>
> El 29/10/2026, más tarde, salió también el que ese mismo arreglo había dejado acá: los tres del
> cliente ya están medidos contra un `INIT/` de verdad, con `AO_INIT_DIR` al lado de la
> `AO_DAT_DIR` que ya existía. De paso aparecieron las dos cosas que sólo se ven con archivos de
> verdad: el comentario que los índices dejan pegado al valor —`Walk1=4582 ' arriba`— se perdía
> al reescribir la línea, y un `Graficos.ini` puede definir el mismo dibujo dos veces, con lo que
> el editor, que los ve iguales, devolvía el número más chico y cambiaba cuatro líneas del
> `Personajes.ini` sin que nadie se lo pidiera.
>
> El 29/10/2026 salió el del ida y vuelta a medias del cliente. De las dos salidas posibles se
> tomó la que ya estaba andando del lado de los mapas: el gráfico se busca por sus recortes, y si
> esos recortes todavía no son ningún GRH el proyecto le da el primer número libre y lo suma a la
> tabla. Buscar y nada más —que era lo que esta lista proponía— dejaba afuera justo el caso que
> importa, el del gráfico hecho acá: sin número no hay manera de nombrarlo en un archivo del
> clásico. Quedó en esta lista lo único que de eso no se resolvió: que los tres del cliente
> siguen sin estar medidos contra archivos de verdad.
>
> El 28/10/2026, al final, salió el de las hojas con nombre no numérico. De las dos salidas que
> decía esta lista se tomó la segunda: el proyecto le da a la hoja un número de archivo propio la
> primera vez que pintás con ella, igual que ya hacía con los números de GRH, y su imagen sale con
> ese nombre al lado del `Graficos.ini`. Avisar en el catálogo hubiera dejado el problema en manos
> del usuario: el editor no tiene por qué pedirle que renombre sus hojas para que el juego las
> entienda. De la misma tanda salió el de los nombres encimados en esa lista: ahora tiene clase
> propia —columnas anchas y el nombre recortado con ellipsis—, en vez de la grilla de 40 px que es
> para miniaturas. El nombre entero sigue estando en el `title`.

> El 30/10/2026 salió el de la caché de la tabla de GRH entre pestañas, que era el único que
> quedaba. De las dos salidas que proponía esta lista se tomó la segunda, releer antes de repartir,
> porque es la única que sirve en los dos modos: en el modo carpeta no hay servidor que pueda
> rechazar una escritura con versión vieja.
>
> No se relee siempre, que hubiera sido pagar varios megas en cada tile que se elige. Se resuelve
> primero con la copia en memoria y, sólo si de ahí sale algún número nuevo, se rehace la cuenta
> sobre la tabla del disco: la tanda que inventa números es la que ya iba a escribir la tabla
> entera, así que la lectura de más se paga donde no se nota. Hay un test que cuenta las relecturas
> para que eso no se pierda.
>
> El arreglo obligó a sacar una escritura de adentro de la cuenta. Renombrar una hoja se guardaba
> en el momento, y al rehacer la cuenta la segunda pasada veía la hoja ya con número, se salteaba
> el renombrado de la tabla e inventaba un GRH nuevo al lado del que ya dibujaba ese recorte. Ahora
> `calcular` no escribe nada: devuelve las hojas renombradas y las guarda quien decide que esa
> cuenta es la definitiva. Lo encontraron los tests que ya estaban.
>
> Quedó en esta lista lo único que de eso no se puede cerrar: la ventana entre releer y escribir.

---

## 1. La ventana entre releer la tabla de GRH y escribirla

**Dónde:** `GrhDelProyecto.resolver`, en `src/importacion/aplicacion/casosDeUso.ts`.

Antes de inventar números, la cuenta se rehace sobre la tabla que está en el disco. Entre esa
lectura y la escritura hay unos milisegundos: si las dos pestañas caen justo ahí, las dos leen la
misma tabla, eligen los mismos números y la segunda escritura deja afuera a la primera. Es la misma
carrera de antes, con la ventana reducida de una sesión entera a un instante.

Se reproduce forzando el orden —que las dos releen antes de que cualquiera escriba—, no abriendo dos
pestañas y usándolas normal.

**Qué haría falta:** en el modo servidor, que el guardado mande la versión que leyó y la ruta de
`app/api/` rechace la escritura si cambió mientras tanto; es el único lugar donde hay alguien que
puede arbitrar. En el modo carpeta no hay forma de cerrarla: la File System Access API no da manera
de tomarse un archivo. Ahí lo que corresponde es detectarlo después, y el lugar natural es
**Diagnóstico**: dos GRH que dibujan exactamente el mismo recorte, o una celda que apunta a un
número que no está en la tabla, son las dos marcas que deja esta carrera.
