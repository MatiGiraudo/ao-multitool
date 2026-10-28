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

---

## 1. Una hoja con nombre no numérico rompe el `Graficos.ini` exportado

**Dónde:** `src/importacion/infraestructura/EscritorGraficosIni.ts`, y el camino que la lleva ahí
es el catálogo de tiles (`src/mapas/ui/CatalogoDeTiles.tsx`).

El catálogo deja elegir cualquier hoja del proyecto. Si la hoja se llama `pasto.png`, el GRH queda
con `archivo: "pasto"` y el exportador escribe `Grh32927=1-pasto-0-0-32-32`. Al volver a leer ese
archivo, `LectorGraficosIni` parsea ese campo con `parseInt`, le da `NaN` y lo deja en `"0"`: el GRH
apunta al archivo 0 y el tile no se resuelve ni acá ni en el juego, que busca `<FileNum>` por
número. Nadie avisa nada al elegir el tile.

**Qué haría falta:** decidir qué queremos de los nombres de hoja. Lo mínimo es avisar en el catálogo
cuando el nombre no es numérico; lo correcto, que el proyecto le asigne un `FileNum` propio a cada
hoja (como hace con los números de GRH) y que exportar las imágenes las copie con ese nombre.
## 2. Listar los mapas guardados los parsea enteros

**Dónde:** `src/mapas/infraestructura/servidor/ArchivosMapaRepositorio.ts`, en `listar()`.

Lee y parsea cada JSON completo para devolver tres campos. Con los 317 mapas de Alkon guardados
(~83 KB cada uno) son unos 26 MB leídos y parseados por cada `GET /api/mapas`, que la pantalla pide
al montarse y después de cada guardado automático. El propio `ResumenDeMapa` dice que es «lo que
alcanza para la lista, sin leer las 40.000 celdas de cada uno», así que hoy la implementación no
cumple lo que promete el tipo.

**Qué haría falta:** guardar el resumen aparte (un `data/mapas/indice.json`, escrito en el mismo
guardado) o leer sólo la cabecera de cada archivo. La primera opción es la que ya usan las
colecciones de un solo JSON.
## 3. Los nombres de las hojas se enciman en el catálogo de tiles

**Dónde:** `src/mapas/ui/CatalogoDeTiles.tsx`, la lista de hojas.

Reusa la clase `.mapa-paleta`, cuya grilla son columnas de 40 px pensadas para miniaturas de 32×32.
Con nombres de archivo adentro, los botones se superponen y no se lee cuál es cuál.

**Qué haría falta:** una clase propia para esa lista, con columnas anchas y el nombre recortado con
ellipsis, o miniaturas en vez de nombres.
## 4. La caché de la tabla de GRH sólo se entera de sus propias escrituras

**Dónde:** `src/importacion/infraestructura/navegador/HttpTablaDeGrh.ts`.

La tabla queda en memoria y se refresca únicamente cuando este mismo adaptador guarda. Con el editor
abierto en dos pestañas, la segunda sigue con la tabla vieja: al elegir un tile, `proximoNumero()`
puede devolver un número que la primera ya repartió, y el segundo guardado pisa al primero. Es la
carrera que arregla `d925788`, pero entre pestañas en vez de entre clics.

**Qué haría falta:** que el guardado mande la versión que leyó y el servidor rechace la escritura si
cambió mientras tanto, o que la tabla se relea antes de repartir un número nuevo.
## 5. Abrir un mapa del proyecto lo vuelve a guardar al segundo

**Dónde:** `src/mapas/ui/PantallaMapas.tsx`, el mismo efecto del punto 3.

`abrirDelProyecto` sube el `sello` y pone `enProyecto` en true, así que el guardado automático
escribe el archivo un segundo después de abrirlo aunque nadie haya tocado nada: 83 KB y un PUT por
cada apertura.

**Qué haría falta:** que el efecto distinga «cambió el mapa» de «se abrió uno», por ejemplo
guardando el sello con el que se abrió y comparando.

## 6. El ida y vuelta del cliente está a medias

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
