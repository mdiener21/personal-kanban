Below is a complete, framework-free implementation plan that a senior JS developer can hand to an LLM (or follow themselves) to graft “save/read JSON to/from OneDrive” onto an existing vanilla SPA that already has an “Export → download JSON” button.

--------------------------------------------------------
1.  High-level flow
--------------------------------------------------------
1. User clicks “Export to OneDrive” (new button next to existing “Download JSON”).  
2. If no valid Microsoft token → pop-up authenticates user (MSAL.js *vanilla* build, no frameworks).  
3. App requests `Files.ReadWrite.All` scope.  
4. App calls `/me/drive/root/children` to let user pick (or create) a folder.  
5. App uploads the in-memory JSON string to  
   `/me/drive/items/{parent-id}:/{filename}.json:/content`  
   (PUT, `Content-Type: application/json`).  
6. App stores the returned `driveId`, `itemId`, `etag`, `downloadUrl` in `localStorage` under key  
   `od_json_meta` so later writes can use `@microsoft.graph.conflictBehavior=replace`  
   and the `If-Match: {etag}` header for safe over-write.  
7. On every future “Export” click the app:  
   a. re-uses the cached ids,  
   b. GETs the file first to obtain a fresh `etag`,  
   c. PUTs the new JSON with the fresh `etag`,  
   d. updates the cached metadata.  
8. “Refresh from OneDrive” button (optional) performs the reverse: GET the file, parse JSON, merge into local state, update UI.  

--------------------------------------------------------
2.  Auth & token layer (vanilla, no build tools)
--------------------------------------------------------
- Add one script tag (or copy the single file)  
  `<script src="https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js"></script>`  
- Create `auth.js` module:

```js
/* auth.js – exposes: login(), logout(), getTokenSilently() */
const msalConfig = {
  auth: {
    clientId: 'YOUR_AZURE_APP_ID',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin   // must be registered in Azure portal
  },
  cache: { cacheLocation: 'localStorage' }
};
const msalClient = new msal.PublicClientApplication(msalConfig);

export async function login() {
  const resp = await msalClient.loginPopup({ scopes: ['Files.ReadWrite.All'] });
  return resp.accessToken;
}
export async function getTokenSilently() {
  const silent = await msalClient.acquireTokenSilent({ scopes: ['Files.ReadWrite.All'] });
  return silent.accessToken;
}
export function logout() { msalClient.logoutPopup(); }
```

--------------------------------------------------------
3.  OneDrive helper module (graph.js)
--------------------------------------------------------
```js
/* graph.js – thin wrappers around fetch */
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graph(url, token, opts = {}) {
  const res = await fetch(GRAPH_BASE + url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json ? res.json() : res.text();
}

export async function listChildren(token, itemId = 'root') {
  return graph(`/me/drive/items/${itemId}/children`, token);
}
export async function uploadJSON(token, parentId, name, content, etag) {
  const url = `/me/drive/items/${parentId}:/${name}:/content?@microsoft.graph.conflictBehavior=replace`;
  return graph(url, token, {
    method: 'PUT',
    headers: etag ? { 'If-Match': etag } : {},
    body: typeof content === 'string' ? content : JSON.stringify(content)
  });
}
export async function downloadJSON(token, itemId) {
  return graph(`/me/drive/items/${itemId}/content`, token);
}
```

--------------------------------------------------------
4.  UI/UX additions (pure DOM, no frameworks)
--------------------------------------------------------
HTML (insert next to existing export button):

```html
<button id="btn-od-export" class="od-btn">Export to OneDrive</button>
<button id="btn-od-import" class="od-btn" style="display:none">Refresh from OneDrive</button>
<span id="od-status"></span>

<!-- lightweight folder-picker overlay -->
<div id="od-picker" class="modal hidden">
  <div class="modal-body">
    <h3>Choose OneDrive folder</h3>
    <ul id="od-breadcrumbs"></ul>
    <ul id="od-list"></ul>
    <button id="od-confirm">Save here</button>
    <button id="od-cancel">Cancel</button>
  </div>
</div>
```

CSS (scoped to avoid clashes):

```css
.od-btn { margin-left: .5rem; }
.modal { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; }
.modal.hidden { display:none; }
.modal-body { background:#fff; padding:1.5rem; min-width:320px; max-height:80vh; overflow:auto; }
#od-list { list-style:none; padding:0; margin:.5rem 0; }
#od-list li { padding:.25rem .5rem; cursor:pointer; }
#od-list li:hover { background:#f2f2f2; }
```

--------------------------------------------------------
5.  Glue code (onedrive.js)
--------------------------------------------------------
```js
/* onedrive.js – orchestrates everything */
import { login, getTokenSilently } from './auth.js';
import { listChildren, uploadJSON, downloadJSON } from './graph.js';

const META_KEY = 'od_json_meta';   // {driveId, itemId, etag, path}
let meta = JSON.parse(localStorage.getItem(META_KEY) || 'null');

export async function exportToOneDrive(jsonString, fileName = 'appData.json') {
  let token;
  try { token = await getTokenSilently(); }
  catch { token = await login(); }          // falls back to popup

  if (!meta) {
    // first time – let user pick folder
    const target = await pickFolder(token);
    const uploadResp = await uploadJSON(token, target.id, fileName, jsonString);
    meta = { driveId: uploadResp.parentReference.driveId,
             itemId: uploadResp.id,
             etag: uploadResp.eTag,
             path: uploadResp.parentReference.path + '/' + fileName };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } else {
    // overwrite existing
    const fresh = await uploadJSON(token, meta.itemId, '', jsonString, meta.etag);
    meta.etag = fresh.eTag;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
  document.getElementById('od-status').textContent = 'Saved to OneDrive';
  document.getElementById('btn-od-import').style.display = 'inline-block';
}

export async function importFromOneDrive() {
  const token = await getTokenSilently();
  const txt = await downloadJSON(token, meta.itemId);
  const data = JSON.parse(txt);
  // merge into your existing app state here
  window.myApp.mergeState(data);
  document.getElementById('od-status').textContent = 'Loaded from OneDrive';
}

/* minimal folder picker – returns {id, name} */
async function pickFolder(token) {
  return new Promise((resolve, reject) => {
    const dlg = document.getElementById('od-picker');
    const listEl = document.getElementById('od-list');
    const bcEl   = document.getElementById('od-breadcrumbs');
    let stack = [{ id: 'root', name: 'Root' }];

    function render() {
      bcEl.innerHTML = stack.map((n,i)=>`<li data-i="${i}">${n.name}</li>`).join('');
      listChildren(token, stack[stack.length-1].id).then(items=>{
        listEl.innerHTML = items.value
          .filter(it=>it.folder)
          .map(it=>`<li data-id="${it.id}">📁 ${it.name}</li>`).join('');
      });
    }
    dlg.classList.remove('hidden');
    render();

    listEl.onclick = e=>{
      const id = e.target.dataset.id;
      if (!id) return;
      const name = e.target.textContent.slice(2);
      stack.push({id,name}); render();
    };
    bcEl.onclick = e=>{
      const idx = +e.target.dataset.i;
      if (isNaN(idx)) return;
      stack = stack.slice(0,idx+1); render();
    };
    document.getElementById('od-confirm').onclick = ()=>{
      dlg.classList.add('hidden');
      resolve(stack[stack.length-1]);
    };
    document.getElementById('od-cancel').onclick = ()=>{
      dlg.classList.add('hidden'); reject('cancelled');
    };
  });
}
```

--------------------------------------------------------
6.  Wiring into existing export button
--------------------------------------------------------
In the file that already contains the “export” logic, add:

```js
import { exportToOneDrive, importFromOneDrive } from './onedrive.js';

document.getElementById('btn-od-export').onclick = async () => {
  const json = window.myApp.createExportJSON(); // your existing function
  await exportToOneDrive(json);
};
document.getElementById('btn-od-import').onclick = importFromOneDrive;
```

--------------------------------------------------------
7.  Error & edge-case checklist
--------------------------------------------------------
- Token expiry – `getTokenSilently` already refreshes; on 401 re-login.  
- `etag` mismatch – Graph returns 412 → re-fetch etag and retry once.  
- File deleted – 404 on upload → clear `localStorage` key and re-prompt folder.  
- Large JSON – Graph allows 4 MB per PUT; if bigger, use upload session (resumable).  
- CORS – Azure portal must add your origin to “SPA” redirect URIs.  
- Concurrent edits – last writer wins (or implement merge UI).  

--------------------------------------------------------
8.  Minimal test plan
--------------------------------------------------------
1. Click “Export to OneDrive” → auth popup → pick folder → file appears in OneDrive.  
2. Modify local data, export again → file overwritten, timestamp updated.  
3. Delete file in OneDrive → next export re-creates without error.  
4. Open app in second tab → “Refresh from OneDrive” pulls latest.  

--------------------------------------------------------
9.  Next iteration ideas (out of scope but noted)
--------------------------------------------------------
- Google Drive twin implementation using Google Picker + Drive REST v3.  
- Offline queue that syncs when back online.  
- Diff/merge UI for conflicts.  

The above is 100 % framework-free, uses only browser APIs plus the single MSAL script, and can be dropped into any existing vanilla codebase without touching the current JSON generation logic.