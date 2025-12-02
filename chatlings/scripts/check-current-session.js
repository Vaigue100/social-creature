/**
 * Instructions to check which account you're logged in as
 */

console.log(`
📋 To check which account you're currently logged in as:

1. Open your browser to: http://localhost:3000/user/integrations.html

2. Open browser DevTools (F12)

3. Go to "Network" tab

4. Refresh the page

5. Look for the "/api/user/me" request

6. Click on it and check the "Response" tab

7. You should see something like:
   {
     "id": "c68164be-42a5-4cb8-9c1a-1a8afbfa7c05",
     "email": "xbarneyroddis_1763807028981@gmail.com"
   }

---

Your accounts:
✅ NEW account (should use this):
   Email: xbarneyroddis_1763807028981@gmail.com
   ID: c68164be-42a5-4cb8-9c1a-1a8afbfa7c05

❌ OLD account (abandon this):
   Email: xbarneyroddis_1763783097928@gmail.com
   ID: c14d0e93-4a92-4597-b1a2-91a72d081f77

---

If you're logged into the NEW account:
1. The integrations page should show "Connect YouTube to Find Chatlings"
2. Click the button and complete OAuth
3. The YouTube connection will move from old to new account
4. Future likes will go to your new account

If you're logged into the OLD account:
1. Log out
2. Go to /user/login.html
3. Log in with: xbarneyroddis_1763807028981@gmail.com
4. Then connect YouTube
`);
