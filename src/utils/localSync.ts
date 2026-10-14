// Utility for syncing files directly from user's local disk via File System Access API

const DB_NAME = 'markdown_studio_local_sync_db';
const STORE_NAME = 'handles';
const KEY_DIR_HANDLE = 'linked_directory_handle';

function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openSyncDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_DIR_HANDLE);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openSyncDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, KEY_DIR_HANDLE);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to store directory handle in IndexedDB', err);
  }
}

export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openSyncDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_DIR_HANDLE);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

export async function verifyDirectoryPermission(handle: FileSystemHandle): Promise<boolean> {
  try {
    const options = { mode: 'read' as const };
    // @ts-ignore
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    // @ts-ignore
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface LocalSyncFile {
  title: string;
  content: string;
  folderPath?: string;
  lastModified: number;
}

export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  currentPath = ''
): Promise<LocalSyncFile[]> {
  const files: LocalSyncFile[] = [];

  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      if (/\.(md|markdown|txt)$/i.test(entry.name)) {
        try {
          const file = await entry.getFile();
          const text = await file.text();
          const title = entry.name.replace(/\.(md|markdown|txt)$/i, '');
          files.push({
            title: title || 'سند وارد شده',
            content: text,
            folderPath: currentPath || undefined,
            lastModified: file.lastModified || Date.now(),
          });
        } catch (e) {
          console.warn(`Error reading local file ${entry.name}`, e);
        }
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        const subPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        const subFiles = await scanDirectoryHandle(entry, subPath);
        files.push(...subFiles);
      }
    }
  }

  return files;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}
