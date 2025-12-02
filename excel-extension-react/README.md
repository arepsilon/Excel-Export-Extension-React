# Excel Export Extension for Tableau

This is a Tableau Dashboard Extension built with React, TypeScript, and Vite. It allows users to export data from Tableau dashboards to formatted Excel files or CSVs.

## 🚀 Getting Started on a New PC

If you have moved this project to a new computer, follow these steps to get it running.

### 1. Prerequisites

Ensure you have the following installed:
- **Node.js**: Download and install from [nodejs.org](https://nodejs.org/) (LTS version recommended).
- **Git**: (Optional) If you are cloning from a repository.

### 2. Installation

Open a terminal (Command Prompt, PowerShell, or VS Code terminal) in the project folder and run:

```bash
npm install
```

This will download all the necessary dependencies listed in `package.json` into a `node_modules` folder.

### 3. Running Locally (Development)

To start the development server:

```bash
npm run dev
```

- The extension will be hosted at `http://localhost:5173` (or another port if 5173 is busy).
- You can now load the extension in Tableau Desktop using the manifest file (`extension.trex`).

### 4. Building for Production

To create a production-ready build:

```bash
npm run build
```

This will create a `dist` folder containing the compiled static files. These files can be hosted on any web server (IIS, Apache, Nginx, etc.).

## 📂 Project Structure

- **`src/`**: Source code
  - **`config-entry.tsx`**: Entry point for the configuration dialog.
  - **`main.tsx`**: Entry point for the main extension popup (if applicable).
  - **`ConfigDialog.tsx`**: Main component for the configuration UI.
  - **`utils/`**: Helper functions for data fetching and export logic.
- **`public/`**: Static assets (images, manifest file).
- **`extension.trex`**: The Tableau Extension Manifest file. **Important:** If you change the hosting URL/port, you must update the `<source-location>` in this file.

## 🛠 Troubleshooting

- **"Could not Fast Refresh"**: If you see this error, try restarting the dev server.
- **Tableau can't load extension**: Ensure the URL in `extension.trex` matches your running server (e.g., `http://localhost:5173`).
