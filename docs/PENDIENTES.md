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
> El 28/10/2026, al final, salió el de las hojas con nombre no numérico. De las dos salidas que
> decía esta lista se tomó la segunda: el proyecto le da a la hoja un número de archivo propio la
> primera vez que pintás con ella, igual que ya hacía con los números de GRH, y su imagen sale con
> ese nombre al lado del `Graficos.ini`. Avisar en el catálogo hubiera dejado el problema en manos
> del usuario: el editor no tiene por qué pedirle que renombre sus hojas para que el juego las
> entienda.

---

## 1. Los nombres de las hojas se enciman en el catálogo de tiles

**Dónde:** `src/mapas/ui/CatalogoDeTiles.tsx`, la lista de hojas.

Reusa la clase `.mapa-paleta`, cuya grilla son columnas de 40 px pensadas para miniaturas de 32×32.
Con nombres de archivo adentro, los botones se superponen y no se lee cuál es cuál.

**Qué haría falta:** una clase propia para esa lista, con columnas anchas y el nombre recortado con
ellipsis, o miniaturas en vez de nombres.
## 2. La caché de la tabla de GRH sólo se entera de sus propias escrituras

**Dónde:** `src/importacion/infraestructura/navegador/HttpTablaDeGrh.ts`.

La tabla queda en memoria y se refresca únicamente cuando este mismo adaptador guarda. Con el editor
abierto en dos pestañas, la segunda sigue con la tabla vieja: al elegir un tile, `proximoNumero()`
puede devolver un número que la primera ya repartió, y el segundo guardado pisa al primero. Es la
carrera que arregla `d925788`, pero entre pestañas en vez de entre clics.

**Qué haría falta:** que el guardado mande la versión que leyó y el servidor rechace la escritura si
cambió mientras tanto, o que la tabla se relea antes de repartir un número nuevo.
## 3. El ida y vuelta del cliente está a medias

**Dónde:** `src/importacion/infraestructura/`, al lado de `EscritorObjDat.ts`.

Los seis archivos vuelven, pero hay una diferencia grande entre los tres del servidor y los tres
del cliente. En `OBJ.dat`, `NPCs.dat` y `Hechizos.dat` el editor reescribe todo lo que maneja, y
está medido contra un servidor de verdad. En `Fxs.ini`, `Personajes.ini` y `Cabezas.ini` lo único
que puede reescribir son los corrimientos: el resto de cada entrada son números de GRH, y el editor
guarda «tal hoja, tal animación», no un número.

**Qué haría falta:** resolver el camino de vuelta, de una animación del proyecto a un número de
GRH. `TablaDeGrh.buscarRecorte` ya encuentra el GRH de un recorte estático; faltaría el de una
animación (buscar un GRH cuyos cuadros sean esos). Con eso resuelto se arreglan de una las tres
cosas: el `GrhIndex` de los objetos, la `Animacion` de los FX y los `Walk1..4` de las apariencias.

Los tres del cliente tampoco están medidos contra archivos reales: en el servidor que tenemos a
mano no están (viven en el cliente, en `INIT/`). El test con `AO_DAT_DIR` cubre los tres del
servidor; para los otros haría falta apuntar a una carpeta `INIT` de verdad.
