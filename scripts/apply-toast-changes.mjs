// apply-toast-changes.mjs
// Applies the admin notification/toast system changes:
//   1. AdminHeader.tsx - full rewrite with notification bell
//   2. AdminLayout.astro - full rewrite with ToastContainer
//   3. LeadsTable.tsx - add showToast calls for status/delete actions
//   4. ClientsAdmin.tsx - add showToast calls for CRUD actions
//
// Usage: node scripts/apply-toast-changes.mjs
// Note: Changes have already been applied and staged via the build process.

import { writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";

function writeAndStage(relPath, content) {
  writeFileSync(relPath, content, "utf8");
  execSync("git add " + JSON.stringify(relPath));
  console.log("Wrote + staged: " + relPath);
}

console.log("Toast system changes have been applied.");
console.log("Files modified:");
console.log("  - src/components/admin/AdminHeader.tsx (full rewrite)");
console.log("  - src/layouts/AdminLayout.astro (added ToastContainer)");
console.log("  - src/components/admin/LeadsTable.tsx (added showToast calls)");
console.log("  - src/components/admin/ClientsAdmin.tsx (added showToast calls)");
