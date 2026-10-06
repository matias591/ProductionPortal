-- Security fix: two RLS policies granted the `public` role (includes anonymous callers
-- holding the public anon key) unrestricted access.
--   profiles."Public profiles"   : ALL, USING true  -> anon could read emails/roles and insert/update/delete profiles (role escalation)
--   order_files."Files access"   : ALL, USING true  -> anon could read attachment paths (public bucket) and write/delete records
-- Signed-in access is unchanged: "Read Profiles", "Admin Update Roles", "Manage Files",
-- "Allow all access for auth users" remain.
--
-- Rollback:
--   create policy "Public profiles" on public.profiles for all to public using (true);
--   create policy "Files access" on public.order_files for all to public using (true);

drop policy if exists "Public profiles" on public.profiles;
drop policy if exists "Files access" on public.order_files;
