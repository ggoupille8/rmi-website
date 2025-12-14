# MCP Server Setup Guide

This guide explains how to set up the GitHub and Vercel MCP servers for Cursor.

## Prerequisites

1. **GitHub Personal Access Token (PAT)**

   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Create a new token with repository access (minimum permissions needed)
   - Copy the token

2. **Vercel Token**
   - Go to Vercel Account Settings → Tokens
   - Create a new token
   - Copy the token

## Setting Up Environment Variables (Windows)

### Option 1: User-Level Environment Variables (Recommended)

1. Open PowerShell as Administrator
2. Set the variables:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_github_token_here", "User")
   [System.Environment]::SetEnvironmentVariable("VERCEL_TOKEN", "your_vercel_token_here", "User")
   ```
3. Restart Cursor for the changes to take effect

### Option 2: Edit in System Properties

1. Press `Win + X` → System → Advanced system settings
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Add `GITHUB_TOKEN` with your GitHub token
5. Add `VERCEL_TOKEN` with your Vercel token
6. Restart Cursor

## Configuration File

The MCP configuration is in `.cursor/mcp.json`. Currently configured with:

- **GitHub MCP**: Uses `@modelcontextprotocol/server-github` ✅

### Vercel MCP Server

**Status**: No official Vercel MCP server package exists yet. The configuration currently only includes GitHub.

If you need Vercel integration:

1. Check the [Model Context Protocol servers repository](https://github.com/modelcontextprotocol/servers) for updates
2. Look for community-built Vercel MCP servers
3. Consider building a custom MCP server using the Vercel API

To add Vercel MCP later, add this entry to `.cursor/mcp.json`:

```json
"vercel": {
  "command": "npx.cmd",
  "args": ["-y", "@modelcontextprotocol/server-vercel"],
  "env": {
    "VERCEL_TOKEN": "%VERCEL_TOKEN%"
  }
}
```

## Important Notes

### GitHub MCP Server

The GitHub MCP server uses the environment variable `GITHUB_PERSONAL_ACCESS_TOKEN`. Make sure to set your `GITHUB_TOKEN` environment variable, and the config will map it correctly.

## Verifying Setup

After setting up tokens and restarting Cursor:

1. Open Cursor
2. Check the MCP server status (usually in settings or status bar)
3. Try using MCP tools in your conversations

## Troubleshooting

- **"Token not found"**: Ensure environment variables are set and Cursor has been restarted
- **"Package not found"**: The MCP server package may need to be installed globally or the package name may be incorrect
- **Windows npx issues**: The config uses `npx.cmd` for Windows compatibility. If issues persist, try changing to `npx` or the full path to npx
