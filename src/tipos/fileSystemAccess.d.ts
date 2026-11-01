/*
 * Lo que le falta a TypeScript de la File System Access API.
 *
 * `lib.dom` ya trae los handles y `createWritable`, pero no los selectores de carpeta y de
 * archivo, ni los permisos, ni recorrer una carpeta. Son estándar (WICG File System Access) y
 * están en Chromium desde hace años; se declaran acá en vez de castear a `any` en cada uso.
 */

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

/** Dónde abre el selector la primera vez: una carpeta conocida, o un handle que ya tengas. */
type UbicacionInicial = FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";

interface DirectoryPickerOptions {
  /** Hace que el navegador recuerde en qué carpeta se abrió la última vez. */
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: UbicacionInicial;
}

/** Un renglón del filtro del selector: tipo MIME → las extensiones que lo representan. */
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

interface OpenFilePickerOptions {
  /** Igual que en el de carpetas: con esto el selector vuelve a abrir donde estuvo. */
  id?: string;
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  startIn?: UbicacionInicial;
  types?: FilePickerAcceptType[];
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}
