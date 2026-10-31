// Utility for Multi-Folder bidirectional 2-way syncing directly with user's local disk (Obsidian-like) via File System Access API

const DB_NAME = 'markdown_studio_local_sync_db';
const STORE_NAME = 'handles';
const KEY_DIR_HANDLE_LEGACY = 'linked_directory_handle';
const KEY_HANDLES_V2 = 'linked_directory_handles_v2';

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

export interface LinkedFolderRecord {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
}

export async function getAllStoredDirectoryHandles(): Promise<LinkedFolderRecord[]> {
  try {
    const db = await openSyncDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_HANDLES_V2);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result) && req.result.length > 0) {
          resolve(req.result);
        } else {
          // Backward compatibility check for legacy single handle
          const oldReq = store.get(KEY_DIR_HANDLE_LEGACY);
          oldReq.onsuccess = () => {
            if (oldReq.result) {
              const migrated: LinkedFolderRecord = {
                id: oldReq.result.name,
                name: oldReq.result.name,
                handle: oldReq.result,
              };
              resolve([migrated]);
            } else {
              resolve([]);
            }
          };
          oldReq.onerror = () => resolve([]);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function addStoredDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<LinkedFolderRecord[]> {
  try {
    const current = await getAllStoredDirectoryHandles();
    const existingIdx = current.findIndex((f) => f.name.toLowerCase() === handle.name.toLowerCase());
    const newRecord: LinkedFolderRecord = {
      id: handle.name,
      name: handle.name,
      handle,
    };

    let updated: LinkedFolderRecord[];
    if (existingIdx !== -1) {
      updated = [...current];
      updated[existingIdx] = newRecord;
    } else {
      updated = [...current, newRecord];
    }

    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updated, KEY_HANDLES_V2);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return updated;
  } catch (err) {
    console.error('Failed to add directory handle in IndexedDB', err);
    return [];
  }
}

export async function removeStoredDirectoryHandle(folderName: string): Promise<LinkedFolderRecord[]> {
  try {
    const current = await getAllStoredDirectoryHandles();
    const updated = current.filter((f) => f.name.toLowerCase() !== folderName.toLowerCase());

    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updated, KEY_HANDLES_V2);
      // Also clear legacy key if same
      store.delete(KEY_DIR_HANDLE_LEGACY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return updated;
  } catch (err) {
    console.error('Failed to remove directory handle in IndexedDB', err);
    return [];
  }
}

export async function clearAllStoredDirectoryHandles(): Promise<void> {
  try {
    const db = await openSyncDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY_HANDLES_V2);
      store.delete(KEY_DIR_HANDLE_LEGACY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function verifyDirectoryPermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  try {
    const options = { mode };
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

export async function scanAllLinkedDirectories(
  folders: LinkedFolderRecord[]
): Promise<{ files: LocalSyncFile[]; successCount: number; errorsCount: number }> {
  const allFiles: LocalSyncFile[] = [];
  let successCount = 0;
  let errorsCount = 0;

  for (const f of folders) {
    try {
      const hasPerm = await verifyDirectoryPermission(f.handle, 'readwrite');
      if (!hasPerm) {
        errorsCount++;
        continue;
      }
      // Scan root folder, using f.name as top-level folderPath
      const folderFiles = await scanDirectoryHandle(f.handle, f.name);
      allFiles.push(...folderFiles);
      successCount++;
    } catch (err) {
      console.warn(`Failed scanning folder ${f.name}:`, err);
      errorsCount++;
    }
  }

  return { files: allFiles, successCount, errorsCount };
}

export async function getOrCreateSubdir(
  rootHandle: FileSystemDirectoryHandle,
  folderPath?: string
): Promise<FileSystemDirectoryHandle> {
  if (!folderPath) return rootHandle;
  const segments = folderPath
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim().replace(/[\\/:*?"<>|]/g, '_'))
    .filter(Boolean);
  let current = rootHandle;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

export function sanitizeFileName(name: string): string {
  const clean = name.replace(/\.md$/i, '').replace(/[\\/:*?"<>|]/g, '_').trim();
  return clean || 'سند_جدید';
}

// Write document content directly to the appropriate local physical folder (multi-folder routing)
export async function writeDocToAppropriateFolder(
  folders: LinkedFolderRecord[],
  doc: { title: string; content: string; folderPath?: string }
): Promise<boolean> {
  if (!folders || folders.length === 0) return false;

  const docFolderPath = (doc.folderPath || '').trim().replace(/\\/g, '/');
  const rootSegment = docFolderPath.split('/').filter(Boolean)[0] || '';

  // Find matching root folder
  let matchedRecord = folders.find((f) => f.name.toLowerCase() === rootSegment.toLowerCase());
  let relativeSubdir = '';

  if (matchedRecord) {
    // Relative subdir inside this specific root folder
    const rest = docFolderPath.slice(rootSegment.length).replace(/^\/+/, '');
    relativeSubdir = rest;
  } else {
    // If no folder matches, save to the first linked folder
    matchedRecord = folders[0];
    relativeSubdir = docFolderPath;
  }

  try {
    // Check permission without prompting (auto-save runs outside click event)
    // @ts-ignore
    if (matchedRecord.handle.queryPermission) {
      // @ts-ignore
      const perm = await matchedRecord.handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        enqueuePendingDiskWrite(doc);
        return false;
      }
    }

    const targetDir = await getOrCreateSubdir(matchedRecord.handle, relativeSubdir);
    const fileName = `${sanitizeFileName(doc.title)}.md`;
    const fileHandle = await targetDir.getFileHandle(fileName, { create: true });

    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(doc.content ?? '');
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Failed writing doc to folder:', matchedRecord.name, err);
    enqueuePendingDiskWrite(doc);
    return false;
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// Global In-Memory Write Queue for Pending Disk Writes
export interface PendingDiskWriteItem {
  id?: string;
  title: string;
  content: string;
  folderPath?: string;
  queuedAt: number;
}

let pendingDiskWritesQueue: PendingDiskWriteItem[] = [];
type QueueChangeCallback = (queue: PendingDiskWriteItem[]) => void;
const queueListeners: Set<QueueChangeCallback> = new Set();

export function getPendingDiskWrites(): PendingDiskWriteItem[] {
  return [...pendingDiskWritesQueue];
}

export function subscribeToPendingQueue(callback: QueueChangeCallback): () => void {
  queueListeners.add(callback);
  callback([...pendingDiskWritesQueue]);
  return () => {
    queueListeners.delete(callback);
  };
}

function notifyQueueChange() {
  queueListeners.forEach((fn) => fn([...pendingDiskWritesQueue]));
}

export function enqueuePendingDiskWrite(doc: { id?: string; title: string; content: string; folderPath?: string }): void {
  const existingIndex = pendingDiskWritesQueue.findIndex(
    (item) => item.title.toLowerCase() === doc.title.toLowerCase() && (item.folderPath || '') === (doc.folderPath || '')
  );
  const newItem: PendingDiskWriteItem = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    folderPath: doc.folderPath,
    queuedAt: Date.now(),
  };

  if (existingIndex !== -1) {
    pendingDiskWritesQueue[existingIndex] = newItem;
  } else {
    pendingDiskWritesQueue.push(newItem);
  }
  notifyQueueChange();
}

export function clearPendingDiskWrites(): void {
  pendingDiskWritesQueue = [];
  notifyQueueChange();
}

// Check if any linked folder requires user gesture to grant readwrite permission
export async function checkFoldersPermissionStatus(folders: LinkedFolderRecord[]): Promise<{
  allGranted: boolean;
  needsPrompt: boolean;
  foldersStatus: { name: string; permission: 'granted' | 'prompt' | 'denied' }[];
}> {
  if (!folders || folders.length === 0) {
    return { allGranted: false, needsPrompt: false, foldersStatus: [] };
  }

  let allGranted = true;
  let needsPrompt = false;
  const statuses: { name: string; permission: 'granted' | 'prompt' | 'denied' }[] = [];

  for (const f of folders) {
    try {
      // @ts-ignore
      if (f.handle.queryPermission) {
        // @ts-ignore
        const perm: 'granted' | 'prompt' | 'denied' = await f.handle.queryPermission({ mode: 'readwrite' });
        statuses.push({ name: f.name, permission: perm });
        if (perm !== 'granted') {
          allGranted = false;
        }
        if (perm === 'prompt') {
          needsPrompt = true;
        }
      } else {
        statuses.push({ name: f.name, permission: 'granted' });
      }
    } catch {
      statuses.push({ name: f.name, permission: 'denied' });
      allGranted = false;
    }
  }

  return { allGranted, needsPrompt, foldersStatus: statuses };
}

// Request permission (must be called inside user click handler) and flush all pending writes
export async function requestPermissionAndFlushQueue(
  folders: LinkedFolderRecord[]
): Promise<{ success: boolean; writtenCount: number; error?: string }> {
  if (!folders || folders.length === 0) {
    return { success: false, writtenCount: 0, error: 'هیچ پوشه‌ای متصل نیست.' };
  }

  let grantedAny = false;
  for (const f of folders) {
    try {
      // @ts-ignore
      if (f.handle.requestPermission) {
        // @ts-ignore
        const perm = await f.handle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          grantedAny = true;
        }
      }
    } catch (e) {
      console.warn(`Permission request failed for ${f.name}`, e);
    }
  }

  if (!grantedAny) {
    return { success: false, writtenCount: 0, error: 'مجوز دسترسی توسط کاربر صادر نشد.' };
  }

  // Flush queue
  let writtenCount = 0;
  const queueToProcess = [...pendingDiskWritesQueue];
  const remainingQueue: PendingDiskWriteItem[] = [];

  for (const item of queueToProcess) {
    const success = await writeDocToAppropriateFolder(folders, item);
    if (success) {
      writtenCount++;
    } else {
      remainingQueue.push(item);
    }
  }

  pendingDiskWritesQueue = remainingQueue;
  notifyQueueChange();

  return { success: true, writtenCount };
}

// 1-Click creation of standard AI Brain second-brain directories inside linked root
export async function createStandardBrainFolders(rootHandle: FileSystemDirectoryHandle): Promise<string[]> {
  const standardDirs = ['Inbox', 'Projects', 'Notes', 'Me', '🧠 مغز هوش مصنوعی'];
  const created: string[] = [];
  for (const dir of standardDirs) {
    try {
      await rootHandle.getDirectoryHandle(dir, { create: true });
      created.push(dir);
    } catch (err) {
      console.warn(`Failed to create standard directory ${dir}`, err);
    }
  }
  return created;
}

