# LINE Automated Filling Monitoring Assistant - Frontend

This directory contains the frontend application for the LINE Automated Filling Monitoring Assistant. It is a **Mobile-First Data Entry & Dashboard** application designed to run inside LINE LIFF.

## 📱 Features

1.  **User Registration (`/register`)**
    *   **Real Name**: Binding user identity.
    *   **Alias Management**: Tag-based input for managing multiple monitoring aliases (e.g., "Manager", "Staff").
    *   **Sheet Monitoring**: Add Google Sheets to monitor, with validation.
    *   **Profile Loading**: Auto-loads existing user data for editing.
    *   **UI/UX**: Vant UI components with custom Tailwind styling for a premium mobile feel.

2.  **Dashboard (`/dashboard`)**
    *   **Status Overview**: Quick view of daily completion status.
    *   **Expandable Report Cards**: Detailed view of each monitored report.
    *   **Unfilled Item Reminders**: Vertical list of specific items that haven't been filled (e.g., "D6 Unfilled").
    *   **Direct Access**: One-click deep link to open the corresponding Google Sheet.

3.  **Navigation**
    *   **Bottom TabBar**: Easy switching between Dashboard and Settings pages.

## 🛠 Tech Stack

*   **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **UI Library**: [Vant 4](https://vant-ui.github.io/vant/) (Mobile-first component library)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **routing**: [Vue Router](https://router.vuejs.org/)
*   **HTTP Client**: [Axios](https://axios-http.com/)
*   **LINE Integration**: [@line/liff](https://developers.line.biz/en/docs/liff/) (SDK for LINE Login & Profile)

## 📂 Project Structure

```bash
frontend/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Reusable components
│   │   └── TabBar.vue   # Bottom navigation component
│   ├── router/          # Route definitions (index.js)
│   ├── services/        # API services
│   │   └── api.js       # Unified API client for n8n backend
│   ├── views/           # Page components
│   │   ├── Register.vue # User settings & registration
│   │   └── Dashboard.vue# Status dashboard
│   ├── App.vue          # Root component (LIFF init logic)
│   ├── main.js          # App entry point
│   └── style.css        # Tailwind directives
├── public/              # Public static files
├── index.html           # HTML entry point (LIFF SDK script included)
├── vite.config.js       # Vite configuration (Vant resolver, Tailwind, path aliases)
├── tailwind.config.js   # Tailwind configuration
├── vercel.json          # Vercel SPA routing configuration
└── postcss.config.js    # PostCSS config
```

## 🚀 Setup & Development

1.  **Install Dependencies**
    ```bash
    cd frontend
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file in the `frontend` directory:
    ```env
    # LINE LIFF ID
    # Get from LINE Developers Console > LIFF > Your LIFF App
    VITE_LIFF_ID=your_liff_id_here

    # n8n API Base URL (Webhook URL)
    # Example: https://your-instance.app.n8n.cloud/webhook
    VITE_API_BASE_URL=https://lorawu.app.n8n.cloud/webhook
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *   Access at `http://localhost:5173/` (or your configured port).
    *   For mobile testing, use Chrome DevTools Device Mode (iPhone X/12 view).

## 🔗 API Integration

The frontend integrates with n8n backend through these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user-register` | Register or update user profile |
| GET | `/user-profile?userId=xxx` | Get existing user profile |
| GET | `/report-status?userId=xxx` | Get report filling status |

### API Service Module (`src/services/api.js`)

```javascript
import { userApi, reportApi } from '@/services/api';

// Register/Update user
const response = await userApi.register({
  userId: 'U12345',
  realName: '王小明',
  aliases: ['小明', 'Ming'],
  sheetUrls: [{ name: '每日報表', url: 'https://...' }]
});

// Get user profile
const profile = await userApi.getProfile('U12345');

// Get report status
const status = await reportApi.getStatus('U12345');
```

## 🔐 LIFF Integration Note

The app initializes LIFF in `App.vue`.
*   **Development**: If `VITE_LIFF_ID` is missing/invalid, it runs in Mock Mode (for UI testing).
*   **Production**: Requires a valid LIFF ID to fetch user profile (`liff.getProfile()`) and verify identity.

## 📦 Build for Production

```bash
npm run build
```
Output will be in `dist/` folder, ready for deployment (e.g., Vercel).

## 🌐 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Add environment variables in Vercel dashboard:
   - `VITE_LIFF_ID`
   - `VITE_API_BASE_URL`
4. Deploy!

The `vercel.json` is already configured for SPA routing.

## 🔄 Development Workflow

1. **Local UI Testing**: Run without LIFF ID - app will work in mock mode
2. **LIFF Testing**: Use ngrok or similar to expose local server, then configure LIFF endpoint
3. **Production**: Deploy to Vercel with proper environment variables

## 📝 Notes

- The default route is `/dashboard` (shows status first)
- TabBar provides easy navigation between Dashboard and Settings
- All API calls include proper error handling with user-friendly messages
- Loading states are shown during API requests
