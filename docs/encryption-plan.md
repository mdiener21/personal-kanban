Plan: Local-Only Encrypted Vault (Optional)
Implement at-rest client-side encryption for all Kanban data using WebCrypto, storing only ciphertext in localStorage (single key like board.enc). Users unlock with a passphrase to decrypt into memory; the app never stores the passphrase and never persists plaintext tasks. Add idle auto-lock (10 min) and best-effort in-memory wipe. Keep export as plaintext JSON (portable) while local storage remains encrypted.

Steps

Define encrypted storage format + marker keys

Add an unencrypted metadata key (e.g., kanbanVaultMeta) that indicates encryption is enabled and stores KDF params: version, salt, iterations, kdf = PBKDF2-SHA256, cipher = AES-GCM-256.
Store ciphertext under one localStorage key (per your preference): board.enc (or kanbanVaultCiphertext), containing iv + ciphertext (base64) and format version.
Decide “locked” behavior in storage: when kanbanVaultMeta exists but the session is locked, storage APIs must return a distinct locked error/state (not empty arrays), to prevent accidental migrations/default seeding.
Add WebCrypto “crypto layer”

Create a module like src/modules/crypto.js exporting helpers:
deriveKeyFromPassphrase(passphrase, salt, iterations) → AES-GCM CryptoKey
encryptJson(key, jsonObject) → { iv, ciphertext }
decryptJson(key, payload) → jsonObject
Base64 encode/decode utilities for ArrayBuffers (can live here or in utils.js)
Use PBKDF2(SHA-256) → AES-GCM(256) exactly as requested.
Add session “vault” manager (unlock/lock + auto-lock)

Create src/modules/vault.js (or similar) to own:
In-memory decrypted state (the “vault object”)
The derived key (in memory only)
unlock(passphrase), lock(), isLocked(), isEnabled()
Idle timer (10 minutes) with reset on user activity events (e.g., pointerdown, keydown, touchstart, scroll)
Best-effort wipe on lock() (drop references, clear arrays/objects). Document limitation: JS/DOM can’t guarantee secure wiping of strings.
Add a debounced persistVault() that re-encrypts the full vault and writes board.enc after any save.
Refactor persistence to route through the vault (single choke point)

Update storage.js:
Keep public API stable (loadTasks/saveTasks, etc.) so the rest of the app doesn’t change much.
When encryption is disabled: behave exactly as today.
When encryption is enabled + unlocked: read/write from the in-memory vault object; on write, call persistVault() to update ciphertext in localStorage.
When encryption is enabled + locked: throw/return a locked state that the UI can handle (and critically: do not run ensureBoardsInitialized() migrations/writes).
Move kanbanBoards, kanbanActiveBoardId, and all per-board state into the encrypted vault blob. Keep non-sensitive keys (theme, notification banner visibility) unencrypted.
Add minimal unlock UI + wiring

Add a small modal in index.html (mirrors other modals) with:
Passphrase input + Unlock button
If encryption not yet enabled: “Enable encryption” flow with passphrase + confirm passphrase (minimal, but prevents typos)
A short warning: forgetting passphrase means data is unrecoverable
Links: repo + docs (optional here, but you asked for repo/star links in-app elsewhere already)
Wire it in modals.js and initialization in kanban.js:
On startup: if vault meta exists, show modal and block app initialization until unlocked.
After successful unlock: continue normal init and call renderBoard().
Do not allow backdrop/Escape to dismiss if encrypted data exists and is locked (otherwise the app might proceed and overwrite).
Add enable/disable + lock-now controls (minimal)

Since encryption is optional (default off), add a simple entry point:
Either in Settings modal (settings.js + existing settings UI in index.html)
Or as a menu item near Help in the controls dropdown (simplest discoverability).
Provide “Lock now” action that calls vault.lock() and re-opens the unlock modal.
Update import/export to work with encrypted storage

Fix the localStorage bypass in importexport.js:
Update exportBoard(boardId) to read via storage/vault rather than raw localStorage (otherwise it would export ciphertext).
Keep exports plaintext JSON (your decision), generated from decrypted state.
Ensure import writes into the vault when encryption is enabled/unlocked (and persists encrypted afterward). If locked, require unlock first.
Handle the reports entry point

Reports uses storage too (reports.js / reports.html).
Minimal approach: if locked, show a blocking message with a link back to the main board page to unlock (or add the same unlock modal to reports.html if you want full parity).
Migration strategy (plaintext → encrypted)

On “Enable encryption”:
Read current plaintext state via existing load*() APIs
Build the vault object (boards + active id + per-board columns/tasks/labels/settings)
Encrypt + write kanbanVaultMeta + board.enc
Delete plaintext board keys (kanbanBoards, kanbanActiveBoardId, kanbanBoard:*) to ensure “store only ciphertext”
Ensure legacy single-board migration happens before encryption, or is incorporated into the migration step to avoid data loss.
Documentation + changelog

Update specification-kanban.md with:
New encrypted vault storage model, keys, and lock/unlock behavior
Threat model clarifications (encryption at rest; once unlocked, task text is visible in DOM/memory)
Update CHANGELOG.md under Unreleased with encryption feature + behavior changes.
Update security.md to mention optional at-rest encryption and its limitations.
Verification

Manual:
Enable encryption → reload page → requires passphrase → data restores correctly.
Confirm localStorage contains only kanbanVaultMeta + board.enc for board data (no plaintext kanbanBoard:*).
Wrong passphrase shows error; no data is overwritten.
Auto-lock after 10 min idle; “Lock now” works immediately.
Export produces readable JSON; import works and re-encrypts afterward.
Reports page shows correct data when unlocked; shows “locked” prompt otherwise.
Automated:
Add/adjust Playwright setup so default test runs remain plaintext mode (since encryption is optional).
Add a small focused e2e test that enables encryption, unlocks, and verifies a task title persists across reload (optional but valuable).
Decisions

Scope: App-wide vault (single encrypted blob for all boards).
Mode: Optional (default off).
Auto-lock: Idle timer (10 minutes).
Export: Plaintext JSON export (portable), while local storage remains ciphertext-only.