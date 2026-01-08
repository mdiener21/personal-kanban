# Personal Kanban Board

Live Demo-Site make it yours:  https://mdiener21.github.io/personal-kanban/

A fully local, no-server-required personal kanban board with localStorage persistence.

## Features

- ✅ Local-first (no server needed)
- 🎨 Drag & drop tasks and columns
- 🏷️ Custom labels with colors
- 💾 Export/Import to JSON
- 📱 Responsive design

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

## Deploy (Static Site)

This app builds to a static site. Deploy the contents of `dist/` to any static host.

```bash
npm ci
npm run build
```

- Upload/publish the `dist/` directory.
- If deploying under a sub-path (for example GitHub Pages), set `base` in `vite.config.js` so asset URLs work.

## Project Structure

```text
personal-kanban/
├── src/
│   ├── modules/
│   │   ├── utils.js          # Utility functions
│   │   ├── storage.js        # localStorage operations
│   │   ├── labels.js         # Label management
│   │   ├── columns.js        # Column management
│   │   ├── tasks.js          # Task management
│   │   ├── dragdrop.js       # Drag & drop functionality
│   │   ├── modals.js         # Modal UI logic
│   │   ├── render.js         # Rendering logic
│   │   └── importexport.js   # Import/Export functionality
│   ├── index.html            # Main HTML file
│   ├── kanban.js             # Main entry point
│   └── design.css            # Styles
├── package.json
├── vite.config.js
└── README.md
```

## Usage

- **Add Column**: Click "Add Column" button
- **Add Task**: Click the + icon in any column header
- **Edit Task**: Click on task text to edit
- **Move Task**: Drag and drop tasks between columns
- **Reorder Columns**: Drag column headers using the grip icon
- **Manage Labels**: Click "Manage Labels" to create/edit/delete labels
- **Export Data**: Click "Export" to save your board as JSON
- **Import Data**: Click "Import" to load a previously exported board

## Data Persistence

All data is stored in browser localStorage. **Remember to export regularly** to avoid data loss when clearing browser data.
