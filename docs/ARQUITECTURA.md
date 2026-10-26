# Arquitectura del AO World Editor

Este documento explica cómo está organizado el código y por qué. Cada idea va acompañada de un archivo real del proyecto para que la puedas ver funcionando. Si es tu primera vez con estos conceptos, leelo en orden: cada sección se apoya en la anterior.

---

## 1. Screaming architecture: las carpetas "gritan" de qué trata el sistema

Abrí `src/` y lo primero que ves es:

```
src/
├── graficos/     ← hojas de sprites y animaciones
├── objetos/      ← ítems del juego
├── proyecto/     ← operaciones que cruzan varios módulos (importar un proyecto)
├── compartido/   ← piezas chicas que usan todos
├── contenedor/   ← donde se conectan las piezas (ver sección 4)
└── app/          ← Next.js: rutas, páginas y API
```

La idea es que, al mirar las carpetas, se entienda **de qué trata el sistema** (gráficos, objetos) y no **con qué está hecho** (controllers, services, components). Next.js queda arrinconado en `app/`: es un detalle de entrega, no el centro del proyecto.

Cuando agregues Hechizos, va a aparecer una carpeta `src/hechizos/`. El proyecto "grita" un módulo más.

---

## 2. Las capas dentro de cada módulo

Cada módulo tiene las mismas cuatro carpetas:

```
graficos/
├── dominio/          ← las reglas del negocio. No depende de NADA externo.
├── aplicacion/       ← los casos de uso: qué puede hacer el usuario.
├── infraestructura/  ← cómo se habla con el mundo: disco, HTTP, canvas, formatos JSON.
└── ui/               ← componentes de React.
```

**La regla de oro (Clean Architecture): las dependencias apuntan siempre hacia adentro.**

```
   ui  ─┐
        ├──►  aplicacion  ──►  dominio
infra  ─┘
```

- `dominio/` no importa nada de `aplicacion/`, `infraestructura/`, `ui/`, React ni Next. Por ejemplo, `Animacion.ts` no sabe si existe un navegador.
- `aplicacion/` importa del dominio, pero no de la infraestructura.
- `infraestructura/` y `ui/` pueden importar de las capas de adentro.

**¿Por qué?** Porque el dominio es lo que más vale y lo que menos debería cambiar. Si mañana reemplazás Next por otra cosa, o guardás en una base de datos en lugar de archivos, el dominio y los casos de uso quedan intactos.

---

## 3. Domain Driven Design (DDD)

### 3.1 Lenguaje ubicuo

El código usa las mismas palabras que usamos al hablar del juego: `HojaDeSprites`, `Animacion`, `Frame`, `Grilla`, `Objeto`, `Direccion`, `ReferenciaGrafica`. Si en una charla decimos "el frame 3 de caminar_sur", en el código hay una `Animacion` llamada `caminar_sur` con un `Frame` en la posición 2. Esa coincidencia entre la conversación y el código es lo que DDD llama **lenguaje ubicuo**.

### 3.2 Objetos de valor (value objects)

Son datos que se identifican **por su valor**: dos rectángulos con las mismas coordenadas son "el mismo" rectángulo.

- `graficos/dominio/Rect.ts`: un recorte de la imagen. Nunca es negativo ni de tamaño 0, y eso se garantiza al crearlo.
- `graficos/dominio/Tamanio.ts`, `Frame.ts`, `Grilla.ts`.
- `objetos/dominio/ReferenciaGrafica.ts`: "este objeto usa tal animación".

Todos son **inmutables**: `rect.desplazado(5, 0)` no modifica `rect`, devuelve uno nuevo. Esto evita una familia entera de bugs ("¿quién me cambió este valor?") y además encaja perfecto con React, que detecta cambios comparando referencias.

### 3.3 Entidades

Tienen **identidad**: siguen siendo "la misma" aunque cambien sus datos.

- `Animacion` tiene un `id`. Si la renombrás de `caminar` a `caminar_sur`, sigue siendo la misma animación, y los objetos que la usaban no pierden el vínculo.
- `Objeto` tiene dos números parecidos que conviene no confundir:
  - `clave`: su identidad interna, que no cambia nunca.
  - `numero`: el ID de AO (el del `OBJ.dat`), que vos podés editar.

  Por eso podés renumerar un objeto sin romper nada.

### 3.4 Agregados y raíz de agregado

Un agregado es un grupo de objetos que se guarda y se valida **como una unidad**. La "raíz" es la única puerta de entrada.

- `HojaDeSprites` es la raíz de su agregado: contiene la grilla y las animaciones. Para cambiar una animación, le pedís a la hoja `hoja.conAnimacion(animacionNueva)`. Así la hoja puede hacer cumplir reglas que involucran a todo el grupo. Por ejemplo, en `redimensionada()`, si la imagen se achica a la mitad, **todos** los frames y la grilla se escalan juntos.
- El repositorio guarda la hoja entera de una vez (`data/graficos/<id>.json`).

### 3.5 Servicios de dominio

Algunas reglas no le pertenecen a una sola entidad. Las encontrás en `objetos/dominio/servicios.ts`:

- `ValidadorDeObjetos`: "ID repetido" necesita mirar **todos** los objetos, no uno solo.
- `Autovinculador`: necesita un objeto **y** el catálogo de animaciones.

### 3.6 Contextos delimitados y capa anticorrupción

Gráficos y Objetos son dos **contextos delimitados**: cada uno tiene su propio modelo. Lo importante es que **el dominio de Objetos no importa nada de Gráficos**:

- Un objeto guarda una `ReferenciaGrafica`, que tiene ids y nombres, nunca una `Animacion`.
- Cuando Objetos necesita saber algo de los gráficos, usa su propio puerto `CatalogoGrafico` (`objetos/dominio/CatalogoGrafico.ts`).
- El único archivo que traduce entre los dos mundos es `objetos/infraestructura/CatalogoGraficoDesdeHojas.ts`. Eso es una **capa anticorrupción**: si Gráficos cambia por dentro, sólo se toca ese archivo.

Un detalle útil: si importás objetos cuyas hojas todavía no cargaste, la referencia queda como `pendiente` (con nombres). En cuanto cargás esa hoja, el catálogo la resuelve sola.

---

## 4. Arquitectura hexagonal: puertos y adaptadores

La idea: la aplicación define **puertos** (interfaces que dicen *qué* necesita) y el mundo exterior se conecta con **adaptadores** (clases que dicen *cómo*).

### Un ejemplo completo: guardar una hoja

El **puerto** está en el dominio, en `graficos/dominio/HojaRepositorio.ts`:

```ts
export interface HojaRepositorio {
  listar(): Promise<HojaDeSprites[]>;
  obtener(id: string): Promise<HojaDeSprites | null>;
  guardar(hoja: HojaDeSprites): Promise<void>;
  eliminar(id: string): Promise<void>;
}
```

Ese puerto tiene **tres adaptadores**:

| Adaptador | Dónde corre | Qué hace |
|---|---|---|
| `ArchivosHojaRepositorio` | servidor | Lee y escribe `data/graficos/<id>.json` |
| `HttpHojaRepositorio` | navegador | Llama a `/api/hojas` |
| `MemoriaHojaRepositorio` | tests | Guarda en un `Map` |

El caso de uso `GuardarHoja` (en `graficos/aplicacion/casosDeUso.ts`) recibe un `HojaRepositorio` y **no sabe cuál de los tres es**. En el navegador le llega el HTTP; en los tests, el de memoria. Por eso los tests corren en milisegundos y sin servidor.

Otros puertos del proyecto:

- `AlmacenDeImagenes`: dónde viven los PNG.
- `ProcesadorDeImagenes`: decodificar y redimensionar. En el navegador lo implementa `CanvasProcesadorDeImagenes`; en los tests, un falso.
- `FormatoDeAnimaciones` y `FormatoDeObjetos`: los JSON de intercambio con Unity (`FormatoAoAnim`, `FormatoAoObjs`).
- `GeneradorDeIds`: así los tests pueden usar ids predecibles.

### El recorrido de un clic

Cuando arrastrás un frame y lo soltás:

1. **UI**: `LienzoDeHoja` calcula el desplazamiento y llama a `onDesplazar`.
2. **Dominio**: `EditorDeHojas` le pide a la animación `conFramesDesplazados(...)`. El dominio verifica que el grupo no salga de la imagen.
3. **UI**: `ProveedorDeGraficos.actualizar()` muestra el cambio al instante y programa el guardado.
4. **Aplicación**: 400 ms después corre el caso de uso `GuardarHoja`.
5. **Adaptador HTTP**: `HttpHojaRepositorio` hace `PUT /api/hojas/<id>`.
6. **Adaptador de entrada**: la ruta `app/api/hojas/[id]/route.ts` recibe el JSON, lo convierte al dominio con `HojaMapper.aDominio()` (que **valida** todo de nuevo) y llama a `GuardarHoja` del contenedor del servidor.
7. **Adaptador de disco**: `ArchivosHojaRepositorio` escribe el archivo de forma atómica (primero a un temporal y después lo renombra).

Fijate que los pasos 4 y 6 usan **el mismo caso de uso** con adaptadores distintos. Eso es la arquitectura hexagonal en acción.

### Los DTO y los mappers

El dominio nunca se convierte a JSON directamente. `HojaDto.ts` y `ObjetoDto.ts` definen la forma plana que viaja por HTTP y se guarda en disco, y sus mappers traducen en ambos sentidos. Así podés cambiar el dominio sin romper los archivos guardados, o al revés.

### La raíz de composición

¿Quién decide qué adaptador va con qué caso de uso? Un solo lugar por entorno:

- `src/contenedor/servidor.ts`: adaptadores de disco.
- `src/contenedor/cliente.ts`: adaptadores HTTP y canvas.

Si mañana querés guardar en SQLite, escribís un `SqliteHojaRepositorio implements HojaRepositorio` y cambiás **una línea** en `servidor.ts`.

---

## 5. SOLID, con ejemplos de acá

| Principio | Qué dice | Dónde se ve |
|---|---|---|
| **S**: responsabilidad única | Cada pieza tiene un solo motivo para cambiar | Cada caso de uso es una clase con un solo método `ejecutar` (`RedimensionarHoja`, `ImportarObjetos`…). `LienzoDeHoja` dibuja y traduce gestos, pero no decide reglas. |
| **O**: abierto/cerrado | Extender sin modificar | Un tipo de objeto nuevo se agrega como dato en `TIPOS_DE_OBJETO`; la ficha, el validador y la exportación lo toman solos. Un formato de exportación nuevo es otra clase que implementa `FormatoDeAnimaciones`. |
| **L**: sustitución de Liskov | Cualquier implementación de una interfaz tiene que poder reemplazar a otra | Los tres `HojaRepositorio` son intercambiables; los tests lo demuestran usando el de memoria. |
| **I**: segregación de interfaces | Interfaces chicas y específicas | `AlmacenDeImagenes` (guardar, leer, borrar) está separado de `UbicadorDeImagenes` (armar la URL), que sólo necesita la interfaz. |
| **D**: inversión de dependencias | Depender de abstracciones, no de detalles | Los casos de uso reciben interfaces por constructor y nunca hacen `new ArchivosHojaRepositorio()` por su cuenta. |

---

## 6. La interfaz (React)

- **Proveedores** (`ProveedorDeAplicacion`, `ProveedorDeGraficos`, `ProveedorDeObjetos`): hacen la inyección de dependencias en React. Los componentes piden casos de uso al contexto en vez de crearlos.
- **Componentes contenedores y de presentación**:
  - `EditorDeHojas` y `EditorDeObjetos` manejan el estado de la pantalla.
  - `LienzoDeHoja`, `ListaDeFrames`, `RanuraGrafica` y el resto reciben datos y avisan lo que hizo el usuario, pero no guardan nada por su cuenta.
- **Edición optimista con guardado diferido**: el cambio se ve al instante y se guarda poco después. Si cerrás la pestaña con cambios pendientes, el navegador te avisa.
- **Composición entre módulos en la página**: `app/animaciones/PantallaAnimaciones.tsx` le pasa a `EditorDeHojas` un `renderUso` que muestra «Usada por: …» con datos de Objetos. Gráficos no sabe que Objetos existe; la página los junta.

La interfaz de Objetos **sí** usa piezas de la interfaz de Gráficos (`DibujoDeFrame`, `useGraficos`) para dibujar. Es una decisión consciente: el desacople estricto está en el dominio, que es donde más importa.

---

## 7. Tests

`npm test` corre tres archivos:

- `graficos/dominio/graficos.test.ts`: reglas puras (inmutabilidad, ida y vuelta, tiempos, límites al mover, escalado al redimensionar).
- `graficos/aplicacion/casosDeUso.test.ts`: casos de uso con repositorio y almacén en memoria, más un procesador de imágenes falso.
- `objetos/objetos.test.ts`: reglas de Objeto, validador, autovínculo, y una exportación seguida de importación completa.

No necesitan navegador ni servidor: es el beneficio directo de los puertos.

---

## 8. Receta: agregar el módulo Hechizos

1. **Dominio** (`src/hechizos/dominio/`):
   - `Hechizo.ts`: la entidad, con `clave`, `numero`, nombre, maná, energía, daño o curación, objetivo y palabras mágicas. Métodos inmutables `conManá(n)`, etc., con validaciones.
   - Una `ReferenciaGrafica` para el FX. Reusá la idea de Objetos: el hechizo **no** importa `Animacion`, sólo guarda ids y nombres.
   - `HechizoRepositorio.ts`: el puerto.
2. **Aplicación** (`src/hechizos/aplicacion/`): `CrearHechizo`, `GuardarHechizo`, `ExportarHechizos`, `ImportarHechizos`, más un puerto `FormatoDeHechizos`.
3. **Infraestructura**:
   - `HechizoDto.ts` con su mapper.
   - `servidor/ArchivosHechizoRepositorio.ts` (`data/hechizos/hechizos.json`).
   - `navegador/HttpHechizoRepositorio.ts`.
   - `memoria.ts`.
   - `FormatoAoSpells.ts`.
4. **API**: `src/app/api/hechizos/route.ts` y `[clave]/route.ts`, copiando el estilo de `api/objetos`.
5. **Contenedores**: sumá los casos de uso a `contenedor/servidor.ts` y `contenedor/cliente.ts`.
6. **UI**: `ProveedorDeHechizos` y `EditorDeHechizos` (lista, ficha y vista previa del FX reusando `DibujoDeFrame`).
7. **Página**: `src/app/hechizos/page.tsx`, más una pestaña en `app/_componentes/Encabezado.tsx`.
8. **Tests**: arrancá por el dominio.

Los módulos que siguen (Cuerpos, Cabezas, FX, NPCs y finalmente Mapas) siguen exactamente el mismo molde.
