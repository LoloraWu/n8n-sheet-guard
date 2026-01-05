# LINE Automated Filling Monitoring Assistant - Frontend

This directory contains the frontend application for the LINE Automated Filling Monitoring Assistant. It is a **Mobile-First Data Entry & Dashboard** application designed to run inside LINE LIFF.

## 📱 Features

1.  **User Registration (`/register`)**
    *   **Real Name**: Binding user identity.
    *   **Alias Management**: Tag-based input for managing multiple monitoring aliases (e.g., "Manager", "Staff").
    *   **Sheet Monitoring**: Add Google Sheets to monitor, with validation.
    *   **UI/UX**: Vant UI components with custom Tailwind styling for a premium mobile feel.

2.  **Dashboard (`/dashboard`)**
    *   **Status Overview**: Quick view of daily completion status.
    *   **Expandable Report Cards**: Detailed view of each monitored report.
    *   **Unfilled Item Reminders**: Vertical list of specific items that haven't been filled (e.g., "D6 Unfilled").
    *   **Direct Access**: One-click deep link to open the corresponding Google Sheet.

## 🛠 Tech Stack

*   **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **UI Library**: [Vant 4](https://vant-ui.github.io/vant/) (Mobile-first component library)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **routing**: [Vue Router](https://router.vuejs.org/)
*   **LINE Integration**: [@line/liff](https://developers.line.biz/en/docs/liff/) (SDK for LINE Login & Profile)

## 📂 Project Structure

```bash
frontend/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Reusable components (clean)
│   ├── router/          # Route definitions (index.js)
│   ├── views/           # Page components
│   │   ├── Register.vue # User settings & registration
│   │   └── Dashboard.vue# Status dashboard
│   ├── App.vue          # Root component (LIFF init logic)
│   ├── main.js          # App entry point
│   └── style.css        # Tailwind directives
├── public/              # Public static files
├── index.html           # HTML entry point (LIFF SDK script included)
├── vite.config.js       # Vite configuration (Vant resolver, Tailwind)
├── tailwind.config.js   # Tailwind configuration
└── postcss.config.js    # PostCSS config
```

## 🚀 Setup & Development

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    *   Create a `.env` file based on `.env.example`.
    *   Set `VITE_LIFF_ID` (Get this from LINE Developers Console).

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *   Access at `http://localhost:5173/` (or your configured port).
    *   For mobile testing, use Chrome DevTools Device Mode (iPhone X/12 view).

## 🔗 LIFF Integration Note

The app initializes LIFF in `App.vue`.
*   **Development**: If `VITE_LIFF_ID` is missing/invalid, it runs in Mock Mode (for UI testing).
*   **Production**: Requires a valid LIFF ID to fetch user profile (`liff.getProfile()`) and verify identity.

## 📦 Build for Production

```bash
npm run build
```
Output will be in `dist/` folder, ready for deployment (e.g., Vercel).
