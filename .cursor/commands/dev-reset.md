npm run dev:reset

Use `npm run dev:all` for normal startup (keeps ports preflight).

Use `npm run dev:reset` only when Windows file locks cause `npm ci` failures
or `esbuild.exe` cannot be unlinked. This performs a clean reinstall and then
starts `dev:all`. It removes `node_modules` and runs `npm ci`.
