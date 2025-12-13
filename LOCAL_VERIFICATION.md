# Local Verification Checklist (Vercel Match)

This checklist ensures your local build matches what Vercel will deploy.

## Prerequisites

- Node.js 20.x (check with `node --version`)
- npm installed

## Clean Install (Windows)

Remove all build artifacts and dependencies:

```powershell
# Remove node_modules, dist, and .astro directories
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .astro -ErrorAction SilentlyContinue
```

Or using cmd:

```cmd
rmdir /s /q node_modules 2>nul
rmdir /s /q dist 2>nul
rmdir /s /q .astro 2>nul
```

## Install Dependencies

```powershell
npm install
```

Expected: All dependencies from `package.json` installed without errors.

## Build

```powershell
npm run build
```

Expected output:

- Build completes successfully
- `dist/` directory is created
- No build errors or warnings

## Verify Output Mode

Check `astro.config.mjs` confirms:

- ✅ `output: "hybrid"` (line 16)
- ✅ `adapter: vercel({ runtime: "nodejs20.x" })` (lines 17-19)

## Verify API Endpoints as Serverless Routes

After build, check that API routes are generated as serverless functions:

1. **Check dist structure:**

   ```powershell
   Get-ChildItem -Recurse dist\.vercel\output\functions -ErrorAction SilentlyContinue
   ```

2. **Expected structure:**

   - `dist/.vercel/output/functions/api/quote.func/` should exist
   - Contains serverless function files (`.js`, `.json`)

3. **Verify prerender is disabled:**

   - Check `src/pages/api/quote.ts` has `export const prerender = false;` (line 6)
   - This ensures the route is NOT prerendered and runs as a serverless function

4. **Check vercel.json configuration:**
   - `vercel.json` should specify `runtime: "nodejs20.x"` for all functions (lines 7-10)

## Test API Endpoint (Local)

Start the preview server:

```powershell
npm run preview
```

In another terminal, test the POST endpoint:

**PowerShell (using Invoke-RestMethod):**

```powershell
$body = @{
    name = "Test User"
    company = "Test Company"
    email = "test@example.com"
    message = "Test message"
    serviceType = "Consulting"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Using curl (Windows 10+ or Git Bash):**

```bash
curl -X POST http://localhost:4321/api/quote ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"company\":\"Test Company\",\"email\":\"test@example.com\",\"message\":\"Test message\",\"serviceType\":\"Consulting\",\"timestamp\":\"1704067200000\"}"
```

**Using curl (Linux/Mac/Git Bash):**

```bash
curl -X POST http://localhost:4321/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "company": "Test Company",
    "email": "test@example.com",
    "message": "Test message",
    "serviceType": "Consulting",
    "timestamp": "1704067200000"
  }'
```

**Expected response:**

- Status: 200 OK (if env vars configured) or 500 (if SENDGRID_API_KEY missing)
- Body: `{"ok":true}` on success

**Note:** The endpoint requires environment variables:

- `SENDGRID_API_KEY` (required)
- `QUOTE_TO_EMAIL` (optional, defaults to ggoupille@rmi-llc.net)
- `QUOTE_FROM_EMAIL` (optional, defaults to no-reply@rmi-llc.net)
- Database connection via Vercel Postgres (configured in Vercel dashboard)

## Verification Summary

- [ ] Clean install completed (node_modules, dist, .astro removed)
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed successfully
- [ ] Output mode confirmed as "hybrid"
- [ ] Vercel adapter configured with nodejs20.x runtime
- [ ] API endpoints exist in `dist/.vercel/output/functions/`
- [ ] `export const prerender = false` confirmed in API routes
- [ ] `vercel.json` runtime configuration verified
- [ ] API endpoint responds (may require env vars for full functionality)

## Git Commands to Commit and Push

```powershell
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Your commit message here"

# Push to remote
git push origin main
```

Or step by step:

```powershell
git add .
git commit -m "Update configuration and build settings"
git push origin main
```

If you need to push to a different branch:

```powershell
git push origin <branch-name>
```
