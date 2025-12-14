# Node.js Runtime Configuration

This document explains the Node.js runtime configuration for this project and how to maintain it.

## Current Configuration

### Files That Specify Node.js Version

1. **`.nvmrc`** → `20`

   - Used by `nvm` for local development
   - Run `nvm use` to switch to Node.js 20

2. **`package.json`** → `"engines": { "node": "20.x" }`

   - Declares required Node.js version
   - Used by npm/yarn to warn if wrong version
   - Used by Vercel to determine runtime

3. **`astro.config.mjs`** → `runtime: "nodejs20.x"`

   - Configures Vercel adapter runtime
   - Should match Vercel Project setting

4. **Vercel Dashboard** → Settings → General → Node.js Version
   - **MUST** be set to **20.x**
   - This is the primary source of truth for Vercel deployments

## Runtime Fix Script

### Location

`scripts/fix-runtime.js` (runs via `postbuild` script)

### Purpose

Ensures generated Vercel function configs use `nodejs20.x` runtime, even if the adapter ignores the setting due to local Node version mismatches.

### When It Runs

Automatically after `npm run build` completes.

### Output

- Finds all `.vc-config.json` files in `dist/.vercel/output/functions/`
- Sets `runtime: "nodejs20.x"` if not already set
- Logs which files were fixed

### Can It Be Removed?

**Test Process**:

1. **Set Vercel Project Node.js Version**:

   - Vercel Dashboard → Project → Settings → General
   - Set Node.js Version to **20.x**
   - Save

2. **Ensure Local Node.js 20.x**:

   ```bash
   nvm use  # Uses .nvmrc
   node --version  # Should show v20.x.x
   ```

3. **Temporarily Remove Postbuild Script**:

   ```json
   // In package.json, comment out or remove:
   // "postbuild": "node scripts/fix-runtime.js",
   ```

4. **Build and Verify**:

   ```bash
   npm run build
   npm run test:runtime
   ```

   - The test script will check all function configs automatically
   - Or manually check: `cat dist/.vercel/output/functions/api/quote.func/.vc-config.json`
   - Verify `"runtime": "nodejs20.x"` is present

5. **Deploy and Test**:

   - Deploy to Vercel
   - Check function logs for runtime errors
   - Test API endpoints

6. **If Successful**:

   - Remove `postbuild` script permanently
   - Remove `scripts/fix-runtime.js` file
   - Update this document

7. **If Errors Occur**:
   - Re-add `postbuild` script
   - Keep `fix-runtime.js`
   - Document the specific error encountered

## Known Issues

### Adapter Bug (Potential)

The `@astrojs/vercel` adapter v7.8.2 may ignore the `runtime` setting in `astro.config.mjs` when:

- Local Node.js version is unsupported (< 18.x or > 20.x)
- Local Node.js version differs from target runtime
- Vercel Project Node.js version is not explicitly set

### Workaround

The `fix-runtime.js` script ensures correct runtime regardless of local environment.

## Best Practices

1. **Always use Node.js 20.x locally**:

   ```bash
   nvm install 20
   nvm use
   ```

2. **Set Vercel Project Node.js Version**:

   - Don't rely on auto-detection
   - Explicitly set to 20.x in dashboard

3. **Keep versions in sync**:

   - `.nvmrc` = `20`
   - `package.json` engines = `"20.x"`
   - `astro.config.mjs` runtime = `"nodejs20.x"`
   - Vercel Project setting = `20.x`

4. **Monitor Deployments**:
   - Check function logs after deployment
   - Verify runtime is `nodejs20.x` in logs
   - Test API endpoints work correctly

## CI/CD Configuration

### GitHub Actions

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: ".nvmrc"
```

### GitLab CI

```yaml
image: node:20
```

### CircleCI

```yaml
docker:
  - image: cimg/node:20.0
```

### Vercel

- Uses Vercel Project Node.js Version setting (set to 20.x)
- Falls back to `package.json` engines if not set

## Troubleshooting

### Error: "Runtime nodejs18.x is not supported"

- **Cause**: Vercel Project Node.js version not set to 20.x
- **Fix**: Set in Vercel Dashboard → Settings → General → Node.js Version → 20.x

### Error: "Function runtime mismatch"

- **Cause**: Generated config has wrong runtime
- **Fix**: Ensure `postbuild` script runs, or manually run `node scripts/fix-runtime.js`

### Local Build Uses Wrong Runtime

- **Cause**: Local Node.js version is not 20.x
- **Fix**: Run `nvm use` or install Node.js 20.x

## Future Improvements

1. **Upgrade @astrojs/vercel**: Newer versions may fix the runtime detection issue
2. **Remove fix-runtime.js**: Once adapter bug is confirmed fixed
3. **Automated Testing**: Add CI check to verify runtime in generated configs
