# Deployment Guide

This document covers deployment setup and configuration for the Resource Mechanical Insulation website.

## Prerequisites

- Vercel account
- GitHub/GitLab/Bitbucket repository
- SendGrid account (for email notifications)

## Initial Setup

### 1. Vercel Project Setup

1. Import your repository in Vercel
2. Vercel will automatically detect Astro framework
3. Build settings are configured in `vercel.json`

### 2. Environment Variables

Configure the following environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Required

- `SENDGRID_API_KEY` - Your SendGrid API key for sending quote request emails
- `QUOTE_TO_EMAIL` - Email address to receive quote submissions (defaults to `ggoupille@rmi-llc.net`)
- `QUOTE_FROM_EMAIL` - Email address to send from (defaults to `no-reply@rmi-llc.net`)

#### Optional (for admin access)

- `ADMIN_API_KEY` - Secret key for accessing admin endpoints (see Admin API section)

### 3. Vercel Postgres Setup

#### Step 1: Create Postgres Database

1. In Vercel Dashboard, go to your project
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a name for your database (e.g., `rmi-db`)
5. Select a region closest to your users
6. Click **Create**

#### Step 2: Run Database Schema

1. After creating the database, go to the **Data** tab
2. Click on your Postgres database
3. Navigate to the **SQL Editor** tab
4. Copy and paste the contents of `schema.sql` from the project root
5. Click **Run** to execute the schema

Alternatively, you can use the Vercel CLI:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project
vercel link

# Run the schema
vercel db execute schema.sql
```

#### Step 3: Verify Database Connection

Vercel automatically provides environment variables for your Postgres database:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

These are automatically injected at runtime. The `@vercel/postgres` package uses these automatically.

### 4. Verify Deployment

1. After deployment completes, test the quote submission form
2. Check that emails are being sent successfully
3. Verify quotes are being saved to the database (see Admin API section)

## Database Schema

The `quotes` table stores all quote submissions with the following structure:

- `id` (UUID) - Primary key, auto-generated
- `created_at` (TIMESTAMP) - Submission timestamp
- `name` (VARCHAR) - Contact name
- `company` (VARCHAR) - Company name
- `email` (VARCHAR) - Email address (optional)
- `phone` (VARCHAR) - Phone number (optional)
- `service_type` (VARCHAR) - Type of service requested
- `message` (TEXT) - Project details message
- `metadata` (JSONB) - Additional metadata (IP address, user agent, etc.)

## Admin API

A simple admin API endpoint is available for reading quote submissions. **No UI is provided** - use API clients like `curl`, Postman, or similar tools.

### Endpoint

```
GET /api/admin/quotes
```

### Authentication

The endpoint requires authentication via one of these methods:

#### Bearer Token (Recommended)

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://your-domain.vercel.app/api/admin/quotes
```

#### Basic Auth

```bash
curl -u "admin:YOUR_ADMIN_API_KEY" \
  https://your-domain.vercel.app/api/admin/quotes
```

Set `ADMIN_API_KEY` environment variable in Vercel to enable access.

### Query Parameters

- `limit` (optional) - Number of results to return (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)
- `serviceType` (optional) - Filter by service type

### Example Requests

```bash
# Get first 50 quotes
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://your-domain.vercel.app/api/admin/quotes

# Get quotes with pagination
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  "https://your-domain.vercel.app/api/admin/quotes?limit=20&offset=0"

# Filter by service type
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  "https://your-domain.vercel.app/api/admin/quotes?serviceType=installation"
```

### Response Format

```json
{
  "quotes": [
    {
      "id": "uuid",
      "created_at": "2025-01-XXT...",
      "name": "John Doe",
      "company": "Example Corp",
      "email": "john@example.com",
      "phone": "555-1234",
      "service_type": "installation",
      "message": "Project details...",
      "metadata": {
        "ip": "x.x.x.x",
        "timestamp": "..."
      }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## Security Considerations

### PII Handling

- Quote submissions contain personally identifiable information (PII)
- Data is stored securely in Vercel Postgres
- No verbose logging of PII in application logs
- Admin API requires authentication
- Consider implementing data retention policies

### Rate Limiting

The quote submission endpoint includes rate limiting:

- 5 requests per 15 minutes per IP address
- Rate limit errors return HTTP 429 status

### Spam Protection

- Honeypot field in contact form
- Minimum submission time validation
- Rate limiting

## Troubleshooting

### Database Connection Issues

If quotes aren't being saved:

1. Verify Postgres database is created and active in Vercel Dashboard
2. Check that `schema.sql` has been executed successfully
3. Verify environment variables are set (Vercel sets these automatically)
4. Check function logs in Vercel Dashboard → Functions tab

### Email Not Sending

1. Verify `SENDGRID_API_KEY` is set correctly
2. Check SendGrid account status and API key permissions
3. Verify sender email is verified in SendGrid
4. Check function logs for error messages

### Admin API Access Denied

1. Verify `ADMIN_API_KEY` environment variable is set
2. Check that Authorization header is formatted correctly
3. Ensure Bearer token or Basic auth credentials match the environment variable

## Backup and Recovery

### Database Backups

Vercel Postgres includes automatic backups. To manually backup:

1. Use Vercel CLI: `vercel db pull`
2. Or use `pg_dump` with connection string from environment variables

### Exporting Quotes

Use the admin API to export quotes programmatically:

```bash
# Export all quotes (with pagination)
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  "https://your-domain.vercel.app/api/admin/quotes?limit=1000" \
  > quotes-backup.json
```

## Monitoring

- Monitor function logs in Vercel Dashboard
- Set up alerts for failed quote submissions
- Monitor database storage usage
- Track email delivery rates in SendGrid dashboard

## Future Enhancements

- Admin UI for viewing quotes (not implemented yet)
- Data retention/archival policies
- Export functionality
- Advanced filtering and search
