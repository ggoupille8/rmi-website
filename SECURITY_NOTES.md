# Security Notes

This document tracks security vulnerabilities and remediation decisions.

## Current Vulnerabilities

### astro (Direct Dependency)

- **Current Version**: 4.16.19
- **Severity**: High
- **Vulnerable Range**: <=5.15.8
- **Fixed Version**: 5.16.5 (major version bump - breaking change)
- **Vulnerabilities**:

  1. **GHSA-5ff5-9fcw-vg88** (Moderate): Astro's `X-Forwarded-Host` is reflected without validation
     - **CVSS**: 6.5
     - **CWE**: CWE-20, CWE-470
  2. **GHSA-hr2q-hp5q-x767** (Moderate): URL manipulation via headers, leading to middleware bypass
     - **CVSS**: 6.5
     - **CWE**: CWE-918
  3. **GHSA-wrwg-2hg8-v723** (High): Reflected XSS via server islands feature
     - **CVSS**: 7.1
     - **CWE**: CWE-79, CWE-80
  4. **GHSA-x3h8-62x9-952g** (Low): Development Server has Arbitrary Local File Read
     - **CVSS**: 3.5
     - **CWE**: CWE-22, CWE-23
  5. **GHSA-fvmw-cj7j-j39q** (Moderate): Cloudflare adapter Stored XSS in /\_image endpoint
     - **CVSS**: 5.4
     - **CWE**: CWE-79
  6. **GHSA-ggxq-hp9w-j794** (Moderate): Middleware authentication bypass via URL encoding
     - **CVSS**: 0 (not scored)
     - **CWE**: CWE-22
  7. **GHSA-whqg-ppgf-wp8c** (Moderate): Authentication Bypass via Double URL Encoding
     - **CVSS**: 6.5
     - **CWE**: CWE-647

- **Exploit Conditions**:

  - Most vulnerabilities affect server-side rendering, middleware, and development server
  - This project uses static site generation (`output: "static"`), so many server-side vulnerabilities do not apply
  - The development server vulnerability (GHSA-x3h8-62x9-952g) only affects local development

- **Why Deferred**:
  - Fix requires upgrading to Astro 5.16.5, which is a major version bump (4.x → 5.x)
  - Major version upgrades may introduce breaking changes that require code updates
  - Project is already on the latest 4.x version (4.16.19)
  - Most vulnerabilities are server-side related and do not affect static site generation
  - The high-severity XSS vulnerability (GHSA-wrwg-2hg8-v723) affects server islands feature, which is not used in this static site

### @astrojs/react (Direct Dependency)

- **Current Version**: 3.6.3
- **Severity**: Moderate
- **Vulnerable Range**: 3.6.3-beta.0 - 3.7.0-beta.1
- **Via**: vite (transitive dependency)
- **Fix Available**: Requires upgrading astro to 5.16.5

- **Why Deferred**:
  - Vulnerability is transitive via vite dependency
  - Fix requires Astro major version upgrade (breaking change)

### esbuild (Transitive Dependency)

- **Current Version**: <=0.24.2
- **Severity**: Moderate
- **Vulnerability**: GHSA-67mh-4wv8-2f99 - esbuild enables any website to send requests to development server and read the response
- **CVSS**: 5.3
- **CWE**: CWE-346 (Origin Validation Error)
- **Fix Available**: Requires upgrading astro to 5.16.5

- **Exploit Conditions**:

  - Only affects the development server (`npm run dev`)
  - Does not affect production builds or deployed static sites
  - Requires attacker to have access to the development server

- **Why Deferred**:
  - Only affects local development environment
  - Production builds are not affected
  - Fix requires Astro major version upgrade (breaking change)
  - Development servers should not be exposed to untrusted networks

### vite (Transitive Dependency)

- **Current Version**: 0.11.0 - 6.1.6
- **Severity**: Moderate
- **Via**: esbuild (transitive dependency)
- **Fix Available**: Requires upgrading astro to 5.16.5

- **Why Deferred**:
  - Vulnerability is transitive via esbuild
  - Fix requires Astro major version upgrade (breaking change)

## Summary

**Total Vulnerabilities**: 4 packages (1 high, 3 moderate)

**Risk Assessment**:

- **Production Risk**: Low - This is a static site, most vulnerabilities affect server-side features not used
- **Development Risk**: Moderate - esbuild vulnerability affects dev server, but dev servers should not be exposed publicly
- **Remediation**: All fixes require Astro 5.x upgrade (breaking change)

**Recommendation**:

- Monitor for Astro 4.x security patches (unlikely as 4.x is in maintenance)
- Plan for Astro 5.x migration when ready to handle breaking changes
- Ensure development servers are not exposed to untrusted networks
- Consider upgrading to Astro 5.x during next major refactoring cycle

## Last Updated

2025-01-XX (Date of security audit)
