I removed local config files and embedded the Supabase credentials into js/app-core.js per user request.

Files removed:
- config.js (deleted)

Security note:
- Supabase anon/public key is now hardcoded into app-core.js. This key is visible to anyone who fetches the site.
- This change increases risk if the key was not intended to be public or if RLS is not correctly configured.

If this was a mistake, rotate the key in Supabase immediately and consider reverting this commit and using a CI-based deployment that injects the key during build.
