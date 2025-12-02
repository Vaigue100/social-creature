/**
 * Authentication Check Module
 * Verifies user session and redirects to login if not authenticated
 * Include this at the top of all protected user pages
 */

(async function checkAuthentication() {
    // Skip auth check on public pages
    const publicPages = ['/user/login.html', '/user/signup.html', '/user/setup-password.html'];
    const currentPath = window.location.pathname;

    if (publicPages.some(page => currentPath.endsWith(page))) {
        return; // Allow access to public pages
    }

    try {
        // Check if user is authenticated by trying to fetch their profile
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include' // Important: include cookies
        });

        if (!response.ok) {
            // Not authenticated - redirect to login
            console.log('Session expired or not authenticated, redirecting to login...');
            window.location.href = '/user/login.html?redirect=' + encodeURIComponent(currentPath);
            return;
        }

        // User is authenticated, continue loading the page
        const user = await response.json();
        console.log('✅ Authenticated as:', user.email || user.username);

    } catch (error) {
        // Network error or server error - redirect to login to be safe
        console.error('Auth check failed:', error);
        window.location.href = '/user/login.html?redirect=' + encodeURIComponent(currentPath);
    }
})();
