# SPEC: Enhanced Lead Intelligence & Email Forwarding

## CONTEXT

Graham wants to capture maximum data from every contact form submission and have a one-click button to forward leads to rgoupille@rmi-llc.net. All data collection must be legal under US law.

**Legal framework (US, B2B context):**
- Michigan has no comprehensive state privacy law as of March 2026
- RMI is a B2B company — CCPA and most state privacy laws have revenue/data volume thresholds that don't apply to small businesses
- Collecting IP address, user agent, referrer, timezone, and approximate geo (city/state level from IP) when someone SUBMITS a form is standard business practice and legal
- Browser fingerprinting is legal but controversial — we'll collect basic device data, not advanced fingerprinting
- Precise GPS geolocation (via browser API) requires user consent — we won't use this
- The privacy policy should disclose what's collected — add a brief note near the form

**What we're adding to every form submission:**
1. IP address (already captured — confirmed in Stephen Sumpter's metadata)
2. Approximate location from IP (city, state, country) — via free IP geolocation API
3. User agent string (browser, OS, device type)
4. Referrer URL (how they found the site — Google search, direct, LinkedIn, etc.)
5. UTM parameters (if present — utm_source, utm_medium, utm_campaign)
6. Page URL at time of submission
7. Time on page before submitting (how long they browsed)
8. Screen resolution and viewport size
9. Timezone
10. Whether they're on mobile or desktop
11. Number of page views in session (did they visit multiple sections?)

**What we're NOT collecting (legal risk or requiring consent):**
- Precise GPS coordinates (requires browser permission prompt)
- Browser fingerprint hash (legally gray in California/other states)
- Cookies for cross-site tracking
- Any biometric data

**Email forwarding:**
- One-click "Forward to Sales" button in admin lead detail panel
- Sends a formatted email to rgoupille@rmi-llc.net with all lead details
- Uses the existing Vercel serverless function to call an email API
- Since SendGrid quota is exceeded, use Resend (free tier: 100 emails/day, 3,000/month) as the email provider

---

## TASK 1: Client-Side Data Collection on Contact Form

### Files
- `src/components/landing/ContactForm.tsx` (update — add data collection on submit)

### Approach
1. **Create a `useLeadIntelligence` hook** or inline logic in ContactForm that collects metadata on form submission:
   ```typescript
   const metadata = {
     // Already available in browser
     userAgent: navigator.userAgent,
     language: navigator.language,
     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
     screenWidth: screen.width,
     screenHeight: screen.height,
     viewportWidth: window.innerWidth,
     viewportHeight: window.innerHeight,
     devicePixelRatio: window.devicePixelRatio,
     isMobile: /Mobi|Android/i.test(navigator.userAgent),
     platform: navigator.platform,
     
     // Referrer and UTM
     referrer: document.referrer,
     pageUrl: window.location.href,
     utmSource: new URLSearchParams(window.location.search).get('utm_source'),
     utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
     utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
     utmTerm: new URLSearchParams(window.location.search).get('utm_term'),
     utmContent: new URLSearchParams(window.location.search).get('utm_content'),
     
     // Session behavior (track on page load, compute on submit)
     timeOnPageMs: Date.now() - window.__rmiPageLoadTime,
     connectionType: (navigator as any).connection?.effectiveType || 'unknown',
   };
   ```

2. **Track page load time** — set `window.__rmiPageLoadTime = Date.now()` in the page's head or on component mount

3. **Track page views in session** — use sessionStorage to count section views:
   ```typescript
   // On mount, increment page view counter
   const views = parseInt(sessionStorage.getItem('rmi_views') || '0') + 1;
   sessionStorage.setItem('rmi_views', views.toString());
   metadata.pageViews = views;
   ```

4. **Send metadata with form submission** — add a `metadata` field to the POST body:
   ```typescript
   const response = await fetch('/api/contact', {
     method: 'POST',
     body: JSON.stringify({ ...formData, metadata })
   });
   ```

5. **Add privacy notice** near the submit button — small, unobtrusive text:
   ```
   "By submitting, you agree that we may collect device and browsing information to improve our services."
   ```
   This covers disclosure requirements.

### Verification
- Submit a test form and check that metadata is included in the POST body
- Verify metadata includes all 15+ fields
- Privacy notice is visible near the form
- `npm run build` succeeds

---

## TASK 2: Server-Side IP Geolocation

### Files
- `src/pages/api/contact.ts` (update — add IP geolocation lookup)
- `src/lib/geo-lookup.ts` (new — IP to location helper)

### Approach
1. **Create `src/lib/geo-lookup.ts`:**
   ```typescript
   // Use ip-api.com (free, no API key needed for server-side, 45 req/min limit)
   // Alternative: ipapi.co (free tier: 1,000 req/day)
   export async function getGeoFromIp(ip: string) {
     try {
       const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,lat,lon,isp,org,as,query`);
       const data = await res.json();
       if (data.status === 'success') {
         return {
           country: data.country,
           state: data.regionName,
           city: data.city,
           zip: data.zip,
           lat: data.lat,    // Approximate — city-level, not precise
           lon: data.lon,    // Approximate — city-level, not precise
           isp: data.isp,
           org: data.org,    // Organization name — useful for B2B!
           asn: data.as
         };
       }
       return null;
     } catch {
       return null;
     }
   }
   ```

2. **Update `src/pages/api/contact.ts`** to call the geo lookup:
   ```typescript
   // Get IP from request headers
   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              'unknown';
   
   // Look up geo data
   const geo = await getGeoFromIp(ip);
   
   // Merge client metadata + server geo into the metadata field
   const fullMetadata = {
     ...clientMetadata,
     ip,
     geo
   };
   ```

3. **The `org` field from IP geolocation is gold for B2B** — it often returns the company name of the visitor's employer/ISP. If someone visits from a large manufacturer's network, you'll see the company name before they even submit.

### Verification
- Submit a form → check database → metadata.geo should have city/state/org
- The ip-api.com call doesn't timeout (has a 5s timeout wrapper)
- `npm run build` succeeds

---

## TASK 3: Enhanced Database Storage

### Files
- Database schema (add columns or store in existing metadata JSONB)

### Approach
The current schema already has a `metadata` JSONB column that stores IP and other data. The enhanced metadata will simply be a richer object stored in the same column — no schema migration needed.

**Verify** that the existing `metadata` column can store the expanded data by checking its type. If it's TEXT, it may need to be JSONB. If it's already JSONB or TEXT, no changes needed.

### Verification
- Check current metadata column type
- Confirm expanded metadata saves correctly
- `npm run build` succeeds

---

## TASK 4: Update Admin Lead Detail Panel with Intelligence

### Files
- `src/components/admin/LeadDetail.tsx` (update — show enriched metadata)

### Approach
1. **Add an "Intelligence" section** to the lead detail panel, below the message:
   ```
   📍 LOCATION
   Dearborn, MI, United States
   Organization: WPC Group (from IP)
   
   🖥️ DEVICE
   Desktop — Windows 11 — Chrome 120
   Screen: 1920×1080 — Viewport: 1536×864
   
   🔗 SOURCE
   Referrer: google.com (organic search)
   UTM: none
   Time on page: 6m 29s
   Page views: 3
   
   🌐 NETWORK
   IP: 47.50.20.114
   ISP: Charter Communications
   Timezone: America/Detroit
   ```

2. **Parse the user agent** into a readable format — use a simple UA parser (regex, no library needed for basic parsing):
   - Browser name + version
   - OS name + version
   - Mobile vs Desktop

3. **Format time on page** — convert milliseconds to a readable "Xm Ys" format

4. **Show referrer as a source tag** — parse the referrer domain and display it nicely:
   - google.com → "Google Search"
   - linkedin.com → "LinkedIn"
   - facebook.com → "Facebook"
   - direct/empty → "Direct Visit"
   - rmi-llc.net → "Internal Navigation"

5. **Highlight the organization name** if detected from IP geo — this is the most valuable B2B intelligence

### Verification
- Open Stephen Sumpter's lead → Intelligence section shows his geo data
- User agent is parsed into readable format
- Location shows city/state
- `npm run build` succeeds

---

## TASK 5: One-Click "Forward to Sales" Email

### Files
- `package.json` (add `resend` package)
- `src/pages/api/admin/forward-lead.ts` (new — email forwarding endpoint)
- `src/components/admin/LeadDetail.tsx` (update — add forward button)

### Approach
1. **Install Resend SDK:**
   ```bash
   npm install resend
   ```

2. **Create `src/pages/api/admin/forward-lead.ts`:**
   ```typescript
   // POST /api/admin/forward-lead
   // Auth: session cookie required
   // Body: { contactId: string }
   // Action: Sends formatted email to rgoupille@rmi-llc.net
   
   import { Resend } from 'resend';
   
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   // Fetch the contact from database
   // Format a clean HTML email with all details:
   
   const emailHtml = `
     <h2>New Lead from RMI Website</h2>
     <table>
       <tr><td><strong>Name:</strong></td><td>${contact.name}</td></tr>
       <tr><td><strong>Company:</strong></td><td>${contact.company || 'Not provided'}</td></tr>
       <tr><td><strong>Email:</strong></td><td><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
       <tr><td><strong>Phone:</strong></td><td><a href="tel:${contact.phone}">${contact.phone}</a></td></tr>
       <tr><td><strong>Project Type:</strong></td><td>${contact.projectType || 'Not specified'}</td></tr>
     </table>
     <h3>Message</h3>
     <p>${contact.message}</p>
     <h3>Intelligence</h3>
     <table>
       <tr><td><strong>Location:</strong></td><td>${geo.city}, ${geo.state}</td></tr>
       <tr><td><strong>Organization:</strong></td><td>${geo.org}</td></tr>
       <tr><td><strong>Device:</strong></td><td>${device}</td></tr>
       <tr><td><strong>Source:</strong></td><td>${source}</td></tr>
       <tr><td><strong>Time on Page:</strong></td><td>${timeOnPage}</td></tr>
       <tr><td><strong>Submitted:</strong></td><td>${formattedDate}</td></tr>
     </table>
     <p><a href="https://rmi-llc.net/admin/leads">View in Admin Panel</a></p>
   `;
   
   await resend.emails.send({
     from: 'RMI Leads <leads@rmi-llc.net>',  // Requires domain verification in Resend
     to: 'rgoupille@rmi-llc.net',
     subject: `New Lead: ${contact.name}${contact.company ? ' — ' + contact.company : ''}`,
     html: emailHtml
   });
   ```

   **Note on Resend `from` address:** Resend requires domain verification to send from rmi-llc.net. Until that's set up, use `onboarding@resend.dev` as the from address and add a note in the email that it's from the RMI system.

3. **Add "Forward to Sales" button** in LeadDetail.tsx:
   ```tsx
   <button 
     onClick={async () => {
       const res = await fetch('/api/admin/forward-lead', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contactId: lead.id })
       });
       if (res.ok) {
         // Show success toast/indicator
         // Auto-update status to "contacted"
       }
     }}
     className="..."
   >
     📧 Forward to Sales
   </button>
   ```

4. **After forwarding, auto-update the lead status** to "contacted" and add a note: "Forwarded to rgoupille@rmi-llc.net on [date]"

5. **Also add auto-forward option** — a checkbox in admin settings to auto-forward every new lead immediately on submission. This would trigger from the contact.ts API endpoint itself, so Graham gets an email the moment someone submits. This is the most useful feature — you'll know about leads instantly.

### Verification
- Click "Forward to Sales" on Stephen Sumpter → email arrives at rgoupille@rmi-llc.net
- Email contains all lead details + intelligence data
- Lead status auto-updates to "contacted"
- `npm run build` succeeds

---

## ENV VARS NEEDED

```bash
RESEND_API_KEY=re_...  # Get from resend.com after signup (free tier)
```

**Setup steps:**
1. Sign up at resend.com (free, no credit card)
2. Get API key from dashboard
3. Add `RESEND_API_KEY` to Vercel env vars
4. (Optional) Verify rmi-llc.net domain in Resend to send from @rmi-llc.net addresses

---

## EXECUTION ORDER

1. **Task 1** (Client-side collection) — gather browser/device data
2. **Task 2** (Server-side geo) — IP geolocation lookup
3. **Task 3** (Database check) — verify metadata column can store it
4. **Task 4** (Admin UI enrichment) — display intelligence in lead detail
5. **Task 5** (Email forwarding) — one-click forward + auto-forward option

---

## GIT WORKFLOW

- Work directly on `main` branch
- Commit incrementally per task
- Push after each verification

---

## FILES CREATED/MODIFIED

**New files:**
- `src/lib/geo-lookup.ts`
- `src/pages/api/admin/forward-lead.ts`

**Modified files:**
- `src/components/landing/ContactForm.tsx` (add metadata collection + privacy notice)
- `src/pages/api/contact.ts` (add geo lookup, merge metadata)
- `src/components/admin/LeadDetail.tsx` (add intelligence section + forward button)
- `package.json` (add resend)

---

## DEFINITION OF DONE

- [ ] Contact form collects 15+ metadata fields on submission
- [ ] IP geolocation returns city/state/org for each submission
- [ ] Privacy notice visible near submit button
- [ ] Admin lead detail shows full intelligence breakdown
- [ ] "Forward to Sales" button sends formatted email to rgoupille@rmi-llc.net
- [ ] Lead status auto-updates to "contacted" after forwarding
- [ ] Existing leads (Stephen Sumpter) show whatever metadata was already captured
- [ ] New submissions capture the full enriched dataset
- [ ] `npm run build` succeeds
