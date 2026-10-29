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

---

## 1. La caché de la tabla de GRH sólo se entera de sus propias escrituras

**Dónde:** `src/importacion/infraestructura/navegador/HttpTablaDeGrh.ts`.

La tabla queda en memoria y se refresca únicamente cuando este mismo adaptador guarda. Con el editor
abierto en dos pestañas, la segunda sigue con la tabla vieja: al elegir un tile, `proximoNumero()`
puede devolver un número que la primera ya repartió, y el segundo guardado pisa al primero. Es la
carrera que arregla `d925788`, pero entre pestañas en vez de entre clics.

**Qué haría falta:** que el guardado mande la versión que leyó y el servidor rechace la escritura si
cambió mientras tanto, o que la tabla se relea antes de repartir un número nuevo.

## 2. Los tres archivos del cliente no están medidos contra archivos de verdad

**Dónde:** `src/importacion/clasicoReal.test.ts`.

El `OBJ.dat`, el `NPCs.dat` y el `Hechizos.dat` tienen un test que, con `AO_DAT_DIR` apuntando a
un servidor de verdad, importa el archivo entero y comprueba que vuelve a salir clave por clave.
El `Fxs.ini`, el `Personajes.ini` y el `Cabezas.ini` no lo tienen: en el servidor que tenemos a
mano no están, porque viven en el cliente, en `INIT/`.

Es el único lado del ida y vuelta que anda sin red. Los tres se escriben con la misma pieza que
los otros —`reescribirSeccion`, que es la que de verdad decide qué se toca y qué no—, así que lo
que falta medir no es el escritor sino el archivo: cuántas formas raras de escribir una entrada
tiene un `Personajes.ini` de 600 cuerpos que no estén en el de cuatro líneas de los tests.

**Qué haría falta:** una carpeta `INIT` de verdad y una variable propia —`AO_INIT_DIR`— al lado
de la que ya existe, con los mismos tres tests: todas las claves vuelven, el archivo sin editar
sale igual línea por línea, y editar una cosa cambia esa línea y ninguna otra.
