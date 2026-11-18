# Hermes Calorie & Macro Tracker - Cloudflare Worker

Serverless web application and API backend for the Hermes Calorie Tracker plugin.

## Project Structure
- `src/index.ts`: Full-stack worker serving the responsive dashboard and REST API.
- `schema.sql`: Cloudflare D1 SQL schema for permanent cloud SQLite storage.
- `wrangler.jsonc`: Cloudflare Wrangler configuration file.
- `package.json`: NPM scripts and dependencies (`wrangler`, `typescript`, `@cloudflare/workers-types`).
- `tsconfig.json`: TypeScript configuration.
- `.env.example`: Template for Cloudflare API token credentials.

## Available NPM / Wrangler Scripts

```bash
# 1. Start local development server (with hot reload)
npm run dev

# 2. Deploy to Cloudflare Workers (production)
npm run deploy

# 3. Deploy with temporary session preview
npm run deploy:temp

# 4. View real-time logs from deployed worker
npm run tail

# 5. Authenticate Wrangler with your Cloudflare account
npm run login

# 6. Check active Cloudflare account authentication
npm run whoami

# 7. Generate TypeScript definitions
npm run types
```

## Cloudflare Authentication in Cloud / Remote Environments

When running in a cloud VM, container, or remote SSH session, the standard browser callback (`localhost:8976`) cannot reach this machine. Use either of these two headless methods:

### Method 1: Device Code Login (No redirect required)
Run:
```bash
npm run login
# or: npx wrangler login --device
```
1. Wrangler will print a verification URL and an 8-character code.
2. Open that URL in your browser on your computer or phone.
3. Enter the code and click **Approve**.
4. Wrangler in this terminal will automatically authenticate and finish.

### Method 2: API Token (100% non-interactive, permanent)
1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Click **Create Token** → use the **Edit Cloudflare Workers** template.
3. Save the token and account ID to `.env`:
```bash
cp .env.example .env
```
And add your token:
```env
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```
Or export it directly:
```bash
export CLOUDFLARE_API_TOKEN="your_token_here"
```
Wrangler will immediately pick up this token for all commands (`npm run deploy`, `npm run whoami`, etc.) without requiring any login prompt.
