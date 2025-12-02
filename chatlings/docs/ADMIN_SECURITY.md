# Admin Security System

## Overview

The admin panel is now fully protected with multi-layer security:

1. **Authentication** - Must be logged in via Google OAuth
2. **Authorization** - User must have `is_admin` flag in database
3. **IP Whitelist** (Optional) - Can restrict admin access to specific IPs
4. **Session-based** - Uses secure session cookies

## How It Works

### Login Flow

```
User visits site
    ↓
Redirected to /user/login.html
    ↓
Logs in with Google OAuth
    ↓
Session created with userId
    ↓
Redirected to /user/index.html (User Hub)
    ↓
If user tries to access /admin/*
    ↓
Middleware checks:
  1. Is user logged in? (session.userId exists)
  2. Is user an admin? (is_admin = true in database)
  3. Is IP whitelisted? (if ADMIN_ALLOWED_IPS is set)
    ↓
If ALL checks pass → Access granted
If ANY check fails → 403 Forbidden or redirect to login
```

### Protection Layers

**Layer 1: Static Files**
```javascript
// Admin folder requires auth + admin + IP whitelist
app.use('/admin', requireWhitelistedIP);
app.use('/admin', requireAuth);
app.use('/admin', requireAdmin(config));
app.use('/admin', express.static(...));
```

**Layer 2: API Endpoints**
```javascript
// All /api/admin/* routes protected
app.use('/api/admin/*', requireAuth);
app.use('/api/admin/*', requireAdmin(config));

// Specific admin-only endpoints also protected
/api/trash-image
/api/creatures-by-dimensions
/api/animations/upload
/api/animation-types
```

**Layer 3: Image/Animation Access**
```javascript
// Even viewing images requires authentication
app.use('/artwork', requireAuth, express.static(...));
app.use('/images', requireAuth, express.static(...));
app.use('/animations', requireAuth, express.static(...));
```

## Setup Instructions

### Step 1: Run Migration

Add the `is_admin` column to the users table:

```bash
cd chatlings
node scripts/run-migration-41.js
```

### Step 2: Make Yourself Admin

First, log in to the app at least once via Google OAuth to create your user account.

Then run:

```bash
node scripts/set-admin.js your.email@gmail.com
```

Example:
```bash
node scripts/set-admin.js barney@example.com
```

You'll see:
```
✅ SUCCESS! User is now an admin: barney@example.com

They can now access:
  - Admin panel: http://localhost:3000/admin
  - All admin API endpoints
  - Animation management
  - Family browser
  - Conversation review
```

### Step 3: (Optional) Set Up IP Whitelist

Edit your `.env` file:

```bash
# Allow admin access only from specific IPs
ADMIN_ALLOWED_IPS=192.168.1.100,localhost

# Or leave empty to allow from any IP (still requires admin account)
ADMIN_ALLOWED_IPS=
```

**Finding Your IP:**

Windows:
```bash
ipconfig
# Look for "IPv4 Address"
```

Mac/Linux:
```bash
ifconfig
# or
ip addr show
```

**For local development, use:**
```
ADMIN_ALLOWED_IPS=localhost
```

This allows `127.0.0.1`, `::1`, and `localhost`.

## Checking Admin Status

### List All Admins

```bash
node scripts/list-admins.js
```

Output:
```
================================================================================
ADMIN USERS
================================================================================

✅ Found 2 admin user(s):

1. barney@example.com
   ID: 550e8400-e29b-41d4-a716-446655440000
   Created: 1/15/2025, 10:30:00 AM
   Last login: 1/29/2025, 3:45:00 PM

2. admin@example.com
   ID: 660e8400-e29b-41d4-a716-446655440001
   Created: 1/20/2025, 2:15:00 PM
   Last login: 1/28/2025, 11:20:00 AM

================================================================================
```

### Check in Database

```sql
SELECT id, email, is_admin, last_login_at
FROM users
WHERE is_admin = true;
```

## Security Features

### What's Protected

✅ All `/admin/*` pages (family browser, animation manager, etc.)
✅ All `/api/admin/*` endpoints (conversations, topics, etc.)
✅ Admin-only operations (trash images, upload animations)
✅ Image/artwork access (requires login)
✅ Animation files (requires login)

### What's Public

✅ `/user/*` - User hub pages
✅ `/user/login.html` - Login page
✅ `/user/signup.html` - Signup page
✅ `/assets/*` - Static assets (CSS, logos, etc.)
✅ OAuth callback endpoints

## Error Handling

### 401 Unauthorized
**Cause:** Not logged in
**Action:** Redirected to `/user/login.html`

### 403 Forbidden
**Causes:**
- User is logged in but not an admin
- IP address not whitelisted

**API Response:**
```json
{
  "error": "Admin privileges required"
}
```

**Page Response:** Redirected to `/user/index.html?error=admin_required`

### Access Denied Page (Optional)

You could create `/user/access-denied.html` to show a friendly message:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
</head>
<body>
    <h1>🚫 Access Denied</h1>
    <p>You don't have permission to access the admin panel.</p>
    <p>If you believe this is an error, please contact the administrator.</p>
    <a href="/user/index.html">Return to User Hub</a>
</body>
</html>
```

## Logging

The system logs all admin access attempts:

**Successful Access:**
```
✅ Admin access granted: barney@example.com -> /admin/manage-animations.html
```

**Failed Access (Not Admin):**
```
⚠️  Admin access denied for user: regular.user@example.com
```

**Failed Access (Invalid Session):**
```
⚠️  Admin access attempt with invalid user ID: 123
```

**Failed Access (IP Not Whitelisted):**
```
⚠️  Admin access blocked - IP not whitelisted: 203.0.113.50
```

Check your server logs to monitor access attempts.

## Revoking Admin Access

To remove admin privileges from a user:

```sql
UPDATE users
SET is_admin = false
WHERE email = 'user@example.com';
```

Or create a script `scripts/revoke-admin.js`:

```javascript
const { Client } = require('pg');
const dbConfig = require('./db-config');

async function revokeAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node revoke-admin.js <email>');
    process.exit(1);
  }

  const client = new Client(dbConfig);
  await client.connect();

  await client.query(`
    UPDATE users
    SET is_admin = false
    WHERE email = $1
  `, [email]);

  console.log(`✅ Revoked admin access: ${email}`);
  await client.end();
}

revokeAdmin();
```

## Azure Deployment

The same security system works in Azure:

1. **Deploy the app** with the migration and middleware
2. **Log in once** via Google OAuth to create your Azure account
3. **Set yourself as admin** by connecting to Azure database:

```bash
# Using Azure Cloud Shell or local psql
psql -h your-db.postgres.database.azure.com -U admin@your-db -d chatlings

# In psql:
UPDATE users SET is_admin = true WHERE email = 'your.email@gmail.com';
```

Or create a one-time Azure Function/App Service job to run `set-admin.js`.

### Azure IP Whitelist

To whitelist your home IP in Azure:

1. Find your public IP: https://whatismyipaddress.com/
2. Add to Azure `.env`: `ADMIN_ALLOWED_IPS=203.0.113.50`
3. Restart the app

**Note:** Home IPs can change. Consider:
- Using a VPN with static IP
- Setting up Azure VPN Gateway
- Using Azure AD authentication (advanced)
- Just relying on Google OAuth + admin flag (still very secure)

## Best Practices

### Development

- Use `ADMIN_ALLOWED_IPS=localhost` for local testing
- Make only your personal Google account an admin
- Test with a non-admin account to verify protection works

### Production (Azure)

- Set `ADMIN_ALLOWED_IPS` to your office/home IP
- Use environment variables in Azure App Service settings
- Enable HTTPS (Azure does this automatically)
- Monitor access logs regularly
- Keep admin list small (1-3 people max)

### Security Checklist

- [ ] Migration 41 ran successfully
- [ ] You set yourself as admin
- [ ] You tested accessing `/admin` while logged out → should redirect
- [ ] You tested accessing `/admin` as non-admin user → should block
- [ ] You tested accessing `/admin` as admin user → should work
- [ ] IP whitelist configured (if desired)
- [ ] All admin-only operations protected
- [ ] Session secret is random and secure in `.env`

## Troubleshooting

### "Access denied" even though I'm admin

1. Check you're logged in:
   ```sql
   SELECT * FROM users WHERE email = 'your.email@gmail.com';
   ```

2. Verify `is_admin` is `true`:
   ```sql
   SELECT email, is_admin FROM users WHERE email = 'your.email@gmail.com';
   ```

3. Check session is valid (log out and log back in)

4. Check IP whitelist (temporarily disable by setting `ADMIN_ALLOWED_IPS=`)

### Can't access images/animations

Images and animations require authentication (any logged-in user). If you're not logged in, you'll get 401 errors.

This is intentional to protect user privacy and prevent unauthorized access to creature artwork.

### Admin pages return 404

Make sure the middleware is in the correct order:

```javascript
// CORRECT ORDER:
app.use('/admin', requireWhitelistedIP);  // 1. Check IP first
app.use('/admin', requireAuth);           // 2. Check logged in
app.use('/admin', requireAdmin(config));  // 3. Check is admin
app.use('/admin', express.static(...));   // 4. Serve files
```

## Future Enhancements

Possible improvements:

1. **Role-based access** - Different admin levels (super admin, moderator, viewer)
2. **Audit log** - Track all admin actions in database
3. **2FA** - Require two-factor authentication for admin access
4. **Admin invite system** - Send invite codes instead of direct database updates
5. **Admin dashboard** - Show recent admin activity, user stats, etc.
6. **Azure AD integration** - Use Azure Active Directory for enterprise auth

## Summary

Your admin panel is now **fully protected**:

✅ Must log in with Google OAuth
✅ Must have admin flag in database
✅ Optional IP whitelist for extra security
✅ All admin pages and APIs protected
✅ Easy to manage (simple scripts to grant/revoke)
✅ Works identically in local dev and Azure
✅ Comprehensive logging of access attempts

Regular users can **only** access:
- User hub (`/user/*`)
- Their own images/animations (when logged in)
- Public assets

They **cannot** access:
- Admin panel
- Family browser
- Animation uploads
- Conversation reviews
- Image management
- Any admin API endpoints
