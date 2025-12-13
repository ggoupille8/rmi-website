# Environment Variables

This document describes the required environment variables for the quote API endpoint.

## Required Variables

### `SENDGRID_API_KEY`

- **Description**: SendGrid API key for sending emails
- **Required**: Yes
- **How to obtain**:
  1. Sign up for a SendGrid account at https://sendgrid.com
  2. Navigate to Settings > API Keys
  3. Create a new API key with "Mail Send" permissions
  4. Copy the API key (it will only be shown once)

### `QUOTE_TO_EMAIL`

- **Description**: Email address where quote submissions will be sent
- **Required**: No (defaults to `ggoupille@rmi-llc.net`)
- **Example**: `ggoupille@rmi-llc.net`

### `QUOTE_FROM_EMAIL`

- **Description**: Email address used as the sender for quote submission emails
- **Required**: No (defaults to `no-reply@rmi-llc.net`)
- **Example**: `no-reply@rmi-llc.net` or `quotes@rmi-llc.net`
- **Note**: This email must be verified in your SendGrid account

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable:
   - Click **Add New**
   - Enter the variable name (e.g., `SENDGRID_API_KEY`)
   - Enter the variable value
   - Select the environments where it should be available (Production, Preview, Development)
   - Click **Save**

## Setting Environment Variables Locally

Create a `.env` file in the project root (this file is already in `.gitignore`):

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
QUOTE_TO_EMAIL=ggoupille@rmi-llc.net
QUOTE_FROM_EMAIL=no-reply@rmi-llc.net
```

**Note**: Never commit `.env` files to version control. The `.gitignore` file already excludes `.env` files.

## Verification

After setting environment variables:

1. **In Vercel**: Redeploy your application for changes to take effect
2. **Locally**: Restart your development server (`npm run dev`)

## Security Notes

- Keep your `SENDGRID_API_KEY` secret and never expose it in client-side code
- Use different API keys for development and production if possible
- Regularly rotate API keys for security
- The `QUOTE_FROM_EMAIL` must be verified in SendGrid before sending emails
