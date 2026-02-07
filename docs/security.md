
# Security

## How Safe is Your Data in localStorage?

> **localStorage is private to your browser and device, but not encrypted.** Here’s what that means for your data security:

---

## Who Can Access Your Data?

### 1. **Your Website (Same Origin Only)**

Only JavaScript running on the exact same protocol, domain, and port can access your localStorage. This is enforced by the browser’s **same-origin policy**.

**Examples:**

- `https://example.com` ✅ can access its own localStorage
- `https://example.com:8443` ❌ cannot
- `https://sub.example.com` ❌ cannot

### 2. **You (the User)**

You can always access your own data:

- Open DevTools → Application → Local Storage
- Read, modify, or delete anything

This is normal and expected—your browser gives you full control.

### 3. **Browser Extensions (With Permission)**

Extensions can access localStorage **if**:

- You installed them
- They have permission for the site

Most extensions behave, but technically they can read/write your data if allowed.

---

## Who **Cannot** Access Your Data?

❌ **Other Websites**

- No cross-site access
- No iframes from other origins
- No third-party scripts unless you load them

❌ **Your Server**

- localStorage is never sent with HTTP requests
- Unlike cookies, it is client-only

❌ **Other Users**

- Each browser profile and device has its own storage
- No sharing across users or machines

---

## Key Takeaways

- **localStorage is private to your browser and device.**
- **Not encrypted:** Anyone with access to your device/browser profile can read it.
- **No automatic backups:** If you clear localStorage data, your data is lost unless you export it.

**For maximum safety:**

- Export your boards regularly for backup.
- Don’t use on shared/public computers if privacy is critical.

## Who **cannot** access localStorage

❌ Other websites

- No cross-site access
- No iframes from other origins
- No third-party scripts unless you load them

❌ Your server

- localStorage is never sent with HTTP requests
- Unlike cookies, it is client-only

❌ Other users

- Each browser profile + device has its own storage
- No sharing across users or machines