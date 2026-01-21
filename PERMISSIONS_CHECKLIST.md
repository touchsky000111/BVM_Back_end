# Microsoft Graph API Permissions Checklist

## Required Permissions (Currently Configured ✓)

For your application to work, these permissions are needed:

1. **User.Read.All** (Application)
   - Required for: `getUsers()` - Listing users
   - Status: ✅ Configured (needs admin consent)

2. **Mail.Read** (Application)
   - Required for: `searchAll()` - Searching messages/emails
   - Status: ✅ Configured (needs admin consent)

3. **Calendars.Read** (Application)
   - Required for: `searchAll()` - Searching calendar events
   - Status: ✅ Configured (needs admin consent)

4. **Files.Read.All** (Application)
   - Required for: `searchAll()` - Searching OneDrive files
   - Status: ✅ Configured (needs admin consent)

## Optional Permissions

5. **Sites.Read.All** (Application)
   - Possibly needed for: SharePoint sites in search results
   - Status: ✅ Configured (needs admin consent)
   - Note: Keep if you want SharePoint search results

## Unnecessary Permissions (Can Remove)

- **ServiceActivity-Teams.Read.A** - Not used in your code
- **User.Read** (Delegated) - Not needed (using Application permissions only)

## Action Required

⚠️ **All permissions show "Not granted for bwm"**

👉 **Click "Grant admin consent for bwm" button in Azure Portal**

After granting consent, all permission statuses should change to "Granted for bwm".
