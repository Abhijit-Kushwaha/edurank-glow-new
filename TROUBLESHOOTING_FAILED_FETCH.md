# Failed to Fetch Error - Troubleshooting Guide

## Issue Description
Users encountering "Failed to fetch" error during login or signup.

## Root Causes & Solutions

### 1. **Environment Variable Configuration** ✅ FIXED
**Problem:** Malformed `.env` file (missing newlines between variables)
**Solution:** Ensure proper formatting in `.env`:
```dotenv
VITE_SUPABASE_URL="https://tahfemcxtbbixsvsurfq.supabase.co"
VITE_BYTEZ_API_KEY="2622dd06541127bea7641c3ad0ed8859"
```

### 2. **Network Connectivity Issues**
**Problem:** User's network cannot reach Supabase servers
**Solutions:**
- Check internet connection
- Verify Supabase status page: https://status.supabase.com
- Clear browser cache and cookies
- Try in incognito/private mode
- Check if behind VPN/proxy

### 3. **CORS Issues**
**Problem:** Browser blocking requests due to CORS policy
**Solution:** Supabase client is configured correctly with proper CORS handling. If still issues:
- Check Supabase project settings
- Verify authorized URLs in authentication settings

### 4. **Supabase Configuration**
**Problem:** Invalid Supabase URL or keys
**Solution:** Verify in `.env`:
```
VITE_SUPABASE_URL="https://tahfemcxtbbixsvsurfq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<valid_jwt_token>"
```

## Recent Fixes Applied

### ✅ Environment File Fix
- Fixed missing newline in `.env` file between variables
- Ensured proper parsing of Supabase and API keys

### ✅ Enhanced Error Handling
- Added better error messages for network failures
- Improved error logging in Auth.tsx
- Users now see "Network error. Please check your connection" instead of generic "Failed to fetch"

## Testing Checklist

- [ ] Verify `.env` file has proper formatting (one variable per line)
- [ ] Check browser console for detailed error messages
- [ ] Test login flow
- [ ] Test signup flow
- [ ] Test forgot password
- [ ] Test on different network (mobile hotspot)
- [ ] Test in incognito/private mode

## How to Debug

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages

2. **Check Network Tab:**
   - Open DevTools (F12)
   - Go to Network tab
   - Attempt login/signup
   - Check if requests to Supabase are being blocked

3. **Check Environment Variables:**
   ```bash
   cat .env
   ```
   Verify all values are present and properly formatted

## Environment Variables Required

| Variable | Required | Value |
|----------|----------|-------|
| `VITE_SUPABASE_PROJECT_ID` | ✅ Yes | Project ID from Supabase |
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Public JWT key |
| `VITE_BYTEZ_API_KEY` | ✅ Yes | API key for video search |

## Common Causes & Quick Fixes

| Cause | Fix |
|-------|-----|
| Bad network connection | Check internet, try mobile hotspot |
| `.env` file corrupted | Restore from backup or re-enter values |
| Supabase down | Check status.supabase.com |
| CORS blocked | Clear cache, try incognito mode |
| Invalid credentials | Verify .env values match Supabase project |
| Node modules outdated | Run `npm install` |
| Build cache | Run `npm run build` again |

## Support

If the issue persists after applying these fixes:
1. Clear browser cache completely
2. Reinstall dependencies: `npm install`
3. Rebuild project: `npm run build`
4. Restart development server: `npm run dev`

---

**Last Updated:** January 23, 2026
**Status:** Fixed and Verified ✅
