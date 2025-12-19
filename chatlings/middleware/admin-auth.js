/**
 * Admin Authentication Middleware
 * Protects admin routes by checking:
 * 1. User is logged in
 * 2. User has admin flag in database
 * 3. Optional: IP whitelist for extra security
 */

const { Client } = require('pg');

/**
 * Middleware to require authentication (any logged-in user)
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    // For API requests, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // For page requests, redirect to login
    return res.redirect('/user/login.html');
  }
  next();
}

/**
 * Middleware to require admin privileges
 * Must be used AFTER requireAuth
 */
function requireAdmin(dbConfig) {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = new Client(dbConfig);

    try {
      await client.connect();

      // Check if user is admin
      const result = await client.query(`
        SELECT is_admin, email
        FROM users
        WHERE id = $1
      `, [req.session.userId]);

      if (result.rows.length === 0) {
        console.warn(`⚠️  Admin access attempt with invalid user ID: ${req.session.userId}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = result.rows[0];

      if (!user.is_admin) {
        console.warn(`⚠️  Admin access denied for user: ${user.email}`);

        // For API requests, return 403
        if (req.path.startsWith('/api/')) {
          return res.status(403).json({ error: 'Admin privileges required' });
        }

        // For page requests, redirect to user hub with error
        return res.redirect('/user/index.html?error=admin_required');
      }

      // User is admin, allow access
      req.adminEmail = user.email; // Attach email for logging
      next();

    } catch (error) {
      console.error('Error checking admin status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      await client.end();
    }
  };
}

/**
 * Optional: IP whitelist middleware for extra security
 * Add to .env: ADMIN_ALLOWED_IPS=192.168.1.100,203.0.113.1
 */
function requireWhitelistedIP(req, res, next) {
  const allowedIPs = process.env.ADMIN_ALLOWED_IPS;

  if (!allowedIPs) {
    // No whitelist configured, skip this check
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  const whitelist = allowedIPs.split(',').map(ip => ip.trim());

  // Check if client IP is in whitelist
  // Note: req.ip might be ::1 for localhost or ::ffff:127.0.0.1
  const isAllowed = whitelist.some(allowedIP => {
    if (clientIP.includes(allowedIP)) return true;
    if (allowedIP === 'localhost' && (clientIP === '::1' || clientIP.includes('127.0.0.1'))) return true;
    return false;
  });

  if (!isAllowed) {
    console.warn(`⚠️  Admin access blocked - IP not whitelisted: ${clientIP}`);
    return res.status(403).send('Access denied: IP not authorized');
  }

  next();
}

/**
 * Helper to set user as admin (for use in scripts)
 */
async function setUserAsAdmin(email, dbConfig) {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const result = await client.query(`
      UPDATE users
      SET is_admin = true
      WHERE email = $1
      RETURNING id, email
    `, [email]);

    if (result.rows.length === 0) {
      throw new Error(`User not found: ${email}`);
    }

    console.log(`✅ Set ${email} as admin`);
    return result.rows[0];

  } finally {
    await client.end();
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireWhitelistedIP,
  setUserAsAdmin
};
