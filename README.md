# Personal Kanban Board

Live Demo-Site make it yours:  https://mdiener21.github.io/personal-kanban/

Documentation: /docs  [documentation](https://github.com/mdiener21/personal-kanban/tree/main/docs)

No backend. No tracking. No cloud, fully local in your browser, no-server-required personal kanban board with localStorage persistence.

The board data is stored only in your browser (ex. Chrome, Edge, Safari). The data is persistent from session to session even
if you delete all your cache the data is safe in your localStorage in the browser itself.  Safest is it use the export button
that saves the board to a local file you can backup to your cloud storage, drop box, one drive, google drive etc.

<img width="2543" height="1267" alt="image" src="https://github.com/user-attachments/assets/7f3a1a83-84ef-41fa-a099-728e45ad3418" />

<img width="2550" height="1270" alt="image" src="https://github.com/user-attachments/assets/9faa275b-16b0-4b38-b890-c4b503710e70" />


## Data Persistence

All data is stored in browser localStorage. **Remember to export regularly** to avoid data loss when clearing browser data.

## Features

- ✅ Local-first (no server, no backend, no cloud involved)
- 🎨 Drag & drop tasks and columns
- 🏷️ Custom labels and columns with colors
- 💾 Export/Import to local file (format: JSON)
- 📱 Responsive design Mobile and Desktop

## Super Quick Start Host Yourself

The repo includes the built static site already to deploy, simply copy and then upload/publish the `dist/` directory to your webhost.

1. Hetzner: https://www.hetzner.com/de/webhosting


## Deploy (Static Site)

This app builds to a static site. Deploy the contents of `dist/` to any static host.

```bash
npm ci
npm run build
```

- Upload/publish the `dist/` directory.

## Quick Start

From the repository root:

```bash
npm install
npm run dev
```

Vite will open the app (default: `http://localhost:3000`).

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

1. Start the development server:

   ```bash
   npm run dev
   ```

The app will open in your browser at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```
