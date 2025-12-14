# API Endpoint Testing Notes

## Endpoint: `/api/quote`

This document describes how to test the hardened `/api/quote` endpoint.

## Security Features

### 1. Method Restrictions

- **POST**: Only allowed method
- **GET/PUT/DELETE**: Returns 405 Method Not Allowed with `Allow: POST` header

### 2. CORS Policy

- Same-origin requests allowed
- Explicit allowlist: `rmi-llc.net`, `www.rmi-llc.net`
- Cross-origin requests return 403 Forbidden

### 3. Rate Limiting

- **Limit**: 5 requests per 15 minutes per IP
- **Note**: Best-effort only (in-memory, resets in serverless)
- Uses `x-forwarded-for` header with fallbacks
- Returns 429 Too Many Requests with `Retry-After` header

### 4. Honeypot Protection

- Field: `honeypot` (hidden from users)
- If filled: Returns 200 OK but **no email sent** and **no DB write**
- Silent failure to avoid revealing detection

### 5. Input Validation

#### Required Fields

- `name` (max 100 chars)
- `company` (max 200 chars)
- `email` (max 200 chars, validated format)
- `phone` (max 200 chars, validated format, min 10 digits)
- `message` (max 2000 chars)
- `serviceType` (max 100 chars)

#### Validation Rules

- Email: Must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Phone: Must contain only digits, spaces, dashes, parentheses, plus
- Phone: Must contain at least 10 digits
- Timestamp: If provided, must be at least 2 seconds after page load

## Testing Scenarios

### Test 1: Valid Request

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "john@example.com"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": true}` with status 200

### Test 2: Missing Required Field

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    # email missing
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": false, "error": "Email is required"}` with status 400

### Test 3: Invalid Email Format

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "not-an-email"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": false, "error": "Invalid email format"}` with status 400

### Test 4: Invalid Phone Format

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "john@example.com"
    phone = "abc123"  # Not enough digits
    message = "Test message"
    serviceType = "installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": false, "error": "Phone number must contain at least 10 digits"}` with status 400

### Test 5: Field Too Long

```powershell
$body = @{
    name = "A" * 101  # Exceeds 100 char limit
    company = "Test Company"
    email = "john@example.com"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": false, "error": "Name must be 100 characters or less"}` with status 400

### Test 6: Honeypot Triggered

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "john@example.com"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
    honeypot = "spam-bot"  # Honeypot filled
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: `{"ok": true}` with status 200, but **no email sent** and **no DB write**

### Test 7: GET Request (Method Not Allowed)

```powershell
Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method GET
```

**Expected**: `{"ok": false, "error": "Method not allowed"}` with status 405 and header `Allow: POST`

### Test 8: CORS Violation

```powershell
$headers = @{
    "Origin" = "https://evil.com"
    "Content-Type" = "application/json"
}
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "john@example.com"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -Headers $headers
```

**Expected**: `{"ok": false, "error": "Forbidden"}` with status 403

### Test 9: Rate Limiting

```powershell
$body = @{
    name = "John Doe"
    company = "Test Company"
    email = "john@example.com"
    phone = "555-123-4567"
    message = "Test message"
    serviceType = "installation"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json

# Send 6 requests rapidly (limit is 5)
1..6 | ForEach-Object {
    try {
        Invoke-RestMethod -Uri "http://localhost:4321/api/quote" -Method POST -Body $body -ContentType "application/json"
        Write-Host "Request $_: Success"
    } catch {
        Write-Host "Request $_: $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 100
}
```

**Expected**: First 5 succeed, 6th returns 429 with `Retry-After` header

### Test 10: Email Failure (Operational Robustness)

If `SENDGRID_API_KEY` is invalid or SendGrid fails:

**Expected Behavior**:

- Quote is still saved to database
- Returns `{"ok": true, "message": "Your request has been received"}` with status 200
- Error logged without exposing API keys or sensitive details

### Test 11: Database Failure (Operational Robustness)

If database connection fails:

**Expected Behavior**:

- Attempts to send email anyway
- If email succeeds: Returns success
- If email also fails: Returns safe error message (no DB details exposed)

## Logging Verification

### Check Logs Don't Contain Secrets

After running tests, verify logs:

- ✅ No API keys visible
- ✅ No full request bodies logged
- ✅ IP addresses partially masked (e.g., `***` instead of full IP)
- ✅ Error messages sanitized (no "API" or "key" in error messages)

### Example Safe Log Format

```
[request-id] Validation failed: Email is required
[request-id] Rate limit exceeded for IP: ***
[request-id] Email send failed: Email service error
[request-id] Success (saved: abc123)
```

## Operational Notes

1. **Rate Limiting**: In-memory store resets between serverless invocations. This is documented as "best-effort" protection.

2. **Honeypot**: Returns 200 OK to avoid revealing detection mechanism. No processing occurs.

3. **Error Handling**: All errors return safe messages. No internal details (DB errors, API keys, etc.) are exposed.

4. **CORS**: Strict same-origin policy. Only `rmi-llc.net` and `www.rmi-llc.net` allowed.

5. **Method Handling**: Only POST allowed. All other methods return 405 with `Allow: POST` header.

6. **Prerendering**: Confirmed `export const prerender = false;` - endpoint is server-side only.
