# Local Development Guide

This guide provides the technical steps required to set up and run the NexusVault "Anomaly" in your local development environment.

## 1. System Requirements
*   **Node.js:** v18.17.0 or higher.
*   **npm:** v9.0.0 or higher.
*   **OS:** Windows (PowerShell), macOS, or Linux.

## 2. Environment Setup
Create a `.env` file in the root directory and populate it with the following keys. Refer to the specific provider dashboards for your unique credentials.

### Authentication (Clerk)
*   `VITE_CLERK_PUBLISHABLE_KEY`: Your public Clerk key.
*   `CLERK_SECRET_KEY`: Your private Clerk secret.

### Database (Supabase)
*   `SUPABASE_URL`: Your project URL.
*   `SUPABASE_ANON_KEY`: Your public anonymous key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Required for server-side administrative tasks.

### Email (Resend)
*   `RESEND_API_KEY`: Required for sending collaborator invites and notifications.

## 3. Installation & Execution
1.  **Clone the Repository:**
    `git clone https://github.com/Luohino/NexusVault.git`
2.  **Install Dependencies:**
    `npm install`
3.  **Run Development Server:**
    `npm run dev`
4.  **Access the IDE:**
    Open `http://localhost:5173` in your browser.

## 4. Supabase Migrations
If you are modifying the data schema:
1.  Update the Drizzle schema in `src/db/schema.ts`.
2.  Generate a new migration: `npx drizzle-kit generate:pg`.
3.  Apply the migration: `npx drizzle-kit push:pg`.

## 5. Webhooks
To handle user creation and deletion events from Clerk, you must configure a local webhook tunnel (e.g., using `ngrok`) and point it to `/api/webhooks/clerk`.

**Maintainer:** Luohino
