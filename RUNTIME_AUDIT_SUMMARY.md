# Runtime Configuration Audit Summary

**Date**: 2025-01-XX  
**Status**: ✅ Configuration documented and testable

## Current State

### Configuration Files

| File                   | Value                   | Purpose                                  |
| ---------------------- | ----------------------- | ---------------------------------------- |
| `.nvmrc`               | `20`                    | Local development Node version (via nvm) |
| `package.json` engines | `"20.x"`                | Declares required Node version           |
| `astro.config.mjs`     | `runtime: "nodejs20.x"` | Vercel adapter runtime setting           |
| Vercel Dashboard       | **Must be set to 20.x** | Primary source of truth for deployments  |

### Runtime Fix Script

**Status**: ✅ Active (runs via `postbuild` script)

**Location**: `scripts/fix-runtime.js`

**Purpose**: Ensures all generated Vercel function configs use `nodejs20.x` runtime, even if the adapter ignores the setting due to local Node version mismatches.

**Justification**:

- `@astrojs/vercel` v7.8.2 may ignore runtime settings when local Node version differs
- Script is minimal, safe, and well-documented
- Provides defense-in-depth for runtime consistency

**Risk Assessment**: ✅ Low risk

- Only modifies generated config files (not source code)
- Idempotent (safe to run multiple times)
- Clear error handling
- Well-documented removal procedure

### Git Ignore Status

✅ **Verified**: `.vercel/` is in `.gitignore` (line 28)

This ensures:

- Local Vercel project linking info is not committed
- Build artifacts (`dist/.vercel/output/`) are not committed
- Runtime config files are generated fresh on each build

## Known-Good Node.js Versions

### Production

- **Node.js**: 20.x (LTS)
- **Source**: Vercel Project Settings → Node.js Version → 20.x

### Local Development

- **Node.js**: 20.x
- **Source**: `.nvmrc` file
- **Usage**: `nvm use` (auto-detects from `.nvmrc`)

### CI/CD

- **Node.js**: 20.x
- **Sources**:
  - `.nvmrc` (for GitHub Actions with `node-version-file`)
  - Explicit `node:20` (for GitLab CI, CircleCI, etc.)

## Testing Removal of Fix Script

### Prerequisites Checklist

- [ ] Vercel Project Node.js Version set to 20.x in dashboard
- [ ] Local Node.js version is 20.x (`node --version`)
- [ ] `.nvmrc` contains `20`
- [ ] `package.json` has `"engines": { "node": "20.x" }`
- [ ] `astro.config.mjs` has `runtime: "nodejs20.x"`

### Test Procedure

1. **Disable fix script**:

   ```json
   // In package.json, comment out:
   // "postbuild": "node scripts/fix-runtime.js",
   ```

2. **Build and test**:

   ```bash
   npm run build
   npm run test:runtime
   ```

3. **Verify configs manually** (optional):

   ```bash
   # PowerShell
   Get-Content dist\.vercel\output\functions\api\quote.func\.vc-config.json

   # Bash
   cat dist/.vercel/output/functions/api/quote.func/.vc-config.json
   ```

4. **Deploy and monitor**:

   - Deploy to Vercel
   - Check build logs for warnings
   - Test API endpoints (`npm run smoke`)
   - Check function logs for runtime errors

5. **Decision**:
   - ✅ **If all pass**: Remove script and commit
   - ❌ **If any fail**: Re-add script immediately

### Quick Test Command

```bash
npm run build && npm run test:runtime
```

## Recommendations

### Current Approach (Recommended)

**Keep the fix script** until:

1. Vercel Project Node.js version is confirmed set to 20.x
2. Multiple successful deployments without the script
3. No runtime errors in function logs
4. Test script confirms configs are correct consistently

### Future Improvements

1. **Upgrade @astrojs/vercel**: Check if newer versions fix the runtime detection issue
2. **Monitor adapter updates**: Watch for fixes in adapter changelog
3. **Automated testing**: Add CI check to verify runtime configs after build

## Documentation

- **DEPLOYMENT.md**: Complete deployment guide with runtime configuration section
- **RUNTIME_CONFIG.md**: Detailed runtime configuration reference
- **scripts/fix-runtime.js**: Inline documentation with removal instructions
- **scripts/test-runtime-config.js**: Helper script to verify runtime configs

## Conclusion

The runtime configuration is **well-documented, testable, and maintainable**. The fix script provides a safety net while being minimal and low-risk. The testing procedure is clear and repeatable, allowing confident removal when conditions are met.

**Current Recommendation**: Keep the fix script until successful testing confirms it's no longer needed.
