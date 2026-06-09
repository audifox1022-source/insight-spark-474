# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create local environment variables.
cp .env.example .env.local

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Runtime configuration

The app requires Supabase configuration before the React UI can enter the authenticated workspace:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

This repository's Supabase config points to project ref `enbbfidgbylvhoivkvkj`, so the matching URL is `https://enbbfidgbylvhoivkvkj.supabase.co`. If a deployed bundle references another project ref and the browser reports `ERR_NAME_NOT_RESOLVED`, update the deployment environment variables and redeploy.

AI generation and audio analysis run through server-side routes and require:

- `GEMINI_API_KEY`
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` for server-side auth verification
- `BLOB_READ_WRITE_TOKEN` when using audio uploads through Vercel Blob

Optional runtime variables:

- `VITE_GEMINI_MODEL`
- `ALLOWED_ORIGINS`
- `API_RATE_LIMIT_WINDOW_MS`
- `API_RATE_LIMIT_MAX_REQUESTS`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

For local smoke checks, start the app with `npm run dev`, open `http://localhost:8080/`, and verify the backend with `http://localhost:3001/api/health`. The same `/api/health` path is available as a Vercel serverless function and returns a safe runtime configuration summary without secret values.

Before deploying, run `npm run verify:runtime`. It checks required environment variables, Supabase project ref consistency, Supabase DNS resolution, and Supabase anon key project ref matching without printing secret values.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

