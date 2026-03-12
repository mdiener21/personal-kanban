import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8080';
const pb = new PocketBase(PB_URL);

const SYNC_MAP_KEY = 'kanbanSyncMap';
const PB_AUTH_KEY = 'pocketbase_auth';

// PocketBase JS SDK v0.26+ uses LocalAuthStore which automatically
// persists auth state to localStorage (key: "pocketbase_auth").
// No manual cookie import/export needed.

// Dispatch event on auth changes so the UI can react
pb.authStore.onChange(() => {
  window.dispatchEvent(new CustomEvent('auth-changed'));
});

export function getPb() {
  return pb;
}

function hydrateAuthStoreFromLocalStorage() {
  const raw = localStorage.getItem(PB_AUTH_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const token = parsed?.token || '';
    const record = parsed?.record || parsed?.model || null;

    if (token && record) {
      pb.authStore.save(token, record);
      return;
    }

    // Malformed auth payload (for example plain true/false) should be cleared.
    pb.authStore.clear();
    localStorage.removeItem(PB_AUTH_KEY);
  } catch {
    pb.authStore.clear();
    localStorage.removeItem(PB_AUTH_KEY);
  }
}

export function isAuthenticated() {
  if (!pb.authStore.token || !pb.authStore.record) {
    hydrateAuthStoreFromLocalStorage();
  }
  return Boolean(pb.authStore.token && pb.authStore.record);
}

export async function ensureAuthenticated() {
  if (!pb.authStore.token || !pb.authStore.record) {
    hydrateAuthStoreFromLocalStorage();
  }

  if (pb.authStore.token && pb.authStore.record && pb.authStore.isValid) {
    return true;
  }

  if (!pb.authStore.token || !pb.authStore.record) {
    return false;
  }

  // Try to refresh, but don't force a re-login if a token+record session exists.
  if (pb.authStore.isValid) return true;

  try {
    await pb.collection('users').authRefresh();
    return Boolean(pb.authStore.token && pb.authStore.record);
  } catch (err) {
    console.warn('Auth refresh failed', err);
    return Boolean(pb.authStore.token && pb.authStore.record);
  }
}

export function getUser() {
  if (!pb.authStore.record) {
    hydrateAuthStoreFromLocalStorage();
  }
  return pb.authStore.record;
}

export async function loginWithProvider(provider) {
  try {
    const authData = await pb.collection('users').authWithOAuth2({ provider });
    if (authData?.token && authData?.record) {
      pb.authStore.save(authData.token, authData.record);
    }
    return authData;
  } catch (err) {
    console.error('OAuth2 login failed', err);
    throw err;
  }
}

export async function loginUser(email, password) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    if (authData?.token && authData?.record) {
      pb.authStore.save(authData.token, authData.record);
    }
    return authData;
  } catch (err) {
    console.error('Email login failed', err);
    throw err;
  }
}

export async function registerUser(email, password, name) {
  try {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name: name || '',
    };
    const record = await pb.collection('users').create(data);
    return record;
  } catch (err) {
    console.error('Registration failed', err);
    throw err;
  }
}

export function logoutUser() {
  pb.authStore.clear();
}

// ---------------------------------------------------------------------------
// Sync map: maps local UUIDs to PocketBase record IDs
// ---------------------------------------------------------------------------

function loadSyncMap() {
  try {
    const raw = localStorage.getItem(SYNC_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { boards: {}, columns: {}, labels: {}, tasks: {} };
}

function saveSyncMap(map) {
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map));
}

function getPbId(syncMap, entityType, localId) {
  return syncMap[entityType]?.[localId] || null;
}

function setPbId(syncMap, entityType, localId, pbId) {
  if (!syncMap[entityType]) syncMap[entityType] = {};
  syncMap[entityType][localId] = pbId;
}

// ---------------------------------------------------------------------------
// Upsert helper: create or update a record
// ---------------------------------------------------------------------------

async function upsertRecord(collection, syncMap, entityType, localId, data) {
  const pbId = getPbId(syncMap, entityType, localId);

  if (pbId) {
    try {
      const record = await pb.collection(collection).update(pbId, data);
      return record;
    } catch (err) {
      // If record was deleted remotely, fall through to create
      if (err.status !== 404) throw err;
    }
  }

  const record = await pb.collection(collection).create(data);
  setPbId(syncMap, entityType, localId, record.id);
  return record;
}

// ---------------------------------------------------------------------------
// Delete orphaned remote records
// ---------------------------------------------------------------------------

async function deleteOrphans(collection, syncMap, entityType, boardPbId, localIds) {
  const remoteRecords = await pb.collection(collection).getFullList({
    filter: `board = "${boardPbId}"`,
  });

  const localIdSet = new Set(localIds);
  for (const remote of remoteRecords) {
    if (!localIdSet.has(remote.local_id)) {
      await pb.collection(collection).delete(remote.id);
      // Clean up sync map
      if (syncMap[entityType]) {
        delete syncMap[entityType][remote.local_id];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Push: upload a full board with all entities to PocketBase
// ---------------------------------------------------------------------------

export async function pushBoardFull(board, columns, tasks, labels, settings) {
  if (!(await ensureAuthenticated())) throw new Error('Not authenticated');

  const userId = pb.authStore.record.id;
  const syncMap = loadSyncMap();

  // 1. Upsert board
  const boardData = {
    owner: userId,
    name: board.name,
    local_id: board.id,
    settings: settings || {},
    created_at: board.createdAt || '',
  };
  const boardRecord = await upsertRecord('boards', syncMap, 'boards', board.id, boardData);
  const boardPbId = boardRecord.id;

  // 2. Upsert labels (before tasks, since tasks reference labels)
  for (const label of labels) {
    const labelData = {
      owner: userId,
      board: boardPbId,
      local_id: label.id,
      name: label.name,
      color: label.color || '',
      group: label.group || '',
    };
    await upsertRecord('labels', syncMap, 'labels', label.id, labelData);
  }
  await deleteOrphans('labels', syncMap, 'labels', boardPbId, labels.map(l => l.id));

  // 3. Upsert columns (before tasks, since tasks reference columns)
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const colData = {
      owner: userId,
      board: boardPbId,
      local_id: col.id,
      name: col.name,
      color: col.color || '',
      order: i,
      collapsed: col.collapsed || false,
    };
    await upsertRecord('columns', syncMap, 'columns', col.id, colData);
  }
  await deleteOrphans('columns', syncMap, 'columns', boardPbId, columns.map(c => c.id));

  // 4. Upsert tasks (map column and labels local IDs to PB IDs)
  for (const task of tasks) {
    const columnPbId = getPbId(syncMap, 'columns', task.column);
    if (!columnPbId) {
      console.warn(`Skipping task "${task.title}": column "${task.column}" not found in sync map`);
      continue;
    }

    const labelPbIds = (task.labels || [])
      .map(lid => getPbId(syncMap, 'labels', lid))
      .filter(Boolean);

    const taskData = {
      owner: userId,
      board: boardPbId,
      local_id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || '',
      due_date: task.dueDate || '',
      column: columnPbId,
      order: typeof task.order === 'number' ? task.order : 0,
      labels: labelPbIds,
      creation_date: task.creationDate || '',
      change_date: task.changeDate || '',
      done_date: task.doneDate || '',
      column_history: task.columnHistory || [],
    };
    await upsertRecord('tasks', syncMap, 'tasks', task.id, taskData);
  }
  await deleteOrphans('tasks', syncMap, 'tasks', boardPbId, tasks.map(t => t.id));

  // 5. Save updated sync map
  saveSyncMap(syncMap);
}

// ---------------------------------------------------------------------------
// Pull: download all boards with entities from PocketBase
// ---------------------------------------------------------------------------

export async function pullAllBoards() {
  if (!(await ensureAuthenticated())) throw new Error('Not authenticated');

  const userId = pb.authStore.record.id;
  const syncMap = { boards: {}, columns: {}, labels: {}, tasks: {} };

  // Fetch all boards for this user
  const boardRecords = await pb.collection('boards').getFullList({
    filter: `owner = "${userId}"`,
    sort: '-updated',
  });

  if (!boardRecords || boardRecords.length === 0) {
    return [];
  }

  const localBoards = [];

  for (const boardRec of boardRecords) {
    const boardLocalId = boardRec.local_id;
    setPbId(syncMap, 'boards', boardLocalId, boardRec.id);

    // Fetch columns, labels, tasks for this board
    const [columnRecs, labelRecs, taskRecs] = await Promise.all([
      pb.collection('columns').getFullList({
        filter: `board = "${boardRec.id}"`,
        sort: 'order',
      }),
      pb.collection('labels').getFullList({
        filter: `board = "${boardRec.id}"`,
      }),
      pb.collection('tasks').getFullList({
        filter: `board = "${boardRec.id}"`,
        sort: 'order',
      }),
    ]);

    // Build reverse maps: PB ID → local ID
    const columnPbToLocal = {};
    const labelPbToLocal = {};

    for (const col of columnRecs) {
      setPbId(syncMap, 'columns', col.local_id, col.id);
      columnPbToLocal[col.id] = col.local_id;
    }
    for (const lbl of labelRecs) {
      setPbId(syncMap, 'labels', lbl.local_id, lbl.id);
      labelPbToLocal[lbl.id] = lbl.local_id;
    }

    // Convert columns to local format
    const localColumns = columnRecs.map(col => ({
      id: col.local_id,
      name: col.name,
      color: col.color || '',
      order: col.order,
      collapsed: col.collapsed || false,
    }));

    // Convert labels to local format
    const localLabels = labelRecs.map(lbl => ({
      id: lbl.local_id,
      name: lbl.name,
      color: lbl.color || '',
      group: lbl.group || '',
    }));

    // Convert tasks to local format (map PB relation IDs back to local IDs)
    const localTasks = taskRecs.map(t => {
      setPbId(syncMap, 'tasks', t.local_id, t.id);

      const columnLocalId = columnPbToLocal[t.column] || t.column;
      const labelLocalIds = (t.labels || [])
        .map(pbId => labelPbToLocal[pbId])
        .filter(Boolean);

      return {
        id: t.local_id,
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'none',
        dueDate: t.due_date || '',
        column: columnLocalId,
        order: t.order || 0,
        labels: labelLocalIds,
        creationDate: t.creation_date || '',
        changeDate: t.change_date || '',
        doneDate: t.done_date || '',
        columnHistory: t.column_history || [],
      };
    });

    // Convert settings
    const localSettings = boardRec.settings || {};

    // Save to localStorage
    localStorage.setItem(`kanbanBoard:${boardLocalId}:columns`, JSON.stringify(localColumns));
    localStorage.setItem(`kanbanBoard:${boardLocalId}:tasks`, JSON.stringify(localTasks));
    localStorage.setItem(`kanbanBoard:${boardLocalId}:labels`, JSON.stringify(localLabels));
    localStorage.setItem(`kanbanBoard:${boardLocalId}:settings`, JSON.stringify(localSettings));

    localBoards.push({
      id: boardLocalId,
      name: boardRec.name,
      createdAt: boardRec.created_at || '',
    });
  }

  // Save board registry
  localStorage.setItem('kanbanBoards', JSON.stringify(localBoards));

  // Save sync map
  saveSyncMap(syncMap);

  return localBoards;
}
