/*
 * Lo que le falta a TypeScript de la File System Access API.
 *
 * `lib.dom` ya trae los handles y `createWritable`, pero no el selector de carpetas, ni los
 * permisos, ni recorrer una carpeta. Son estándar (WICG File System Access) y están en Chromium
 * desde hace años; se declaran acá en vez de castear a `any` en cada uso.
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

interface DirectoryPickerOptions {
  /** Hace que el navegador recuerde en qué carpeta se abrió la última vez. */
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}
