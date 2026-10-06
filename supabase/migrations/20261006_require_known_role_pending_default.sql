-- Security: self-registered (non-Google, non-invited) users must not get portal access by default.
--   * New email/password sign-ups get role 'pending' (was 'vendor'). Admin invites still work:
--     /api/admin/create-user sets the real role right after the invite. Google @orca-ai.io users
--     still get 'management' via set_orca_google_default_role().
--   * Policies that allowed any `authenticated` user ("true" / auth.role()='authenticated') now
--     require a known portal role via has_portal_role(). All 14 existing users already hold one.
--   * Service-role callers (portal API routes, n8n Mesh/NetSuite) bypass RLS and are unaffected.
--
-- Rollback (restore previous behaviour):
--   create or replace function public.handle_new_user() returns trigger language plpgsql security definer as
--     $f$ begin insert into public.profiles (id,email,role) values (new.id,new.email,'vendor'); return new; end; $f$;
--   alter policy "Read Items" on public.items USING (true);
--   alter policy "Enable all access for auth users" on public.kit_items USING ((auth.role() = 'authenticated'::text));
--   alter policy "Read Kit Items" on public.kit_items USING (true);
--   alter policy "Enable all access for auth users" on public.kits USING ((auth.role() = 'authenticated'::text));
--   alter policy "Read Kits" on public.kits USING (true);
--   alter policy "Allow all access for auth users" on public.order_files USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));
--   alter policy "Manage Files" on public.order_files USING (true);
--   alter policy "Manage Items" on public.order_items USING (true);
--   alter policy "Enable insert for all auth users" on public.orders WITH CHECK (true);
--   alter policy "Read Orders" on public.orders USING (true);
--   alter policy "Update Orders" on public.orders USING (true);
--   alter policy "Read Profiles" on public.profiles USING (true);
--   alter policy "Manage Seapod Files" on public.seapod_files USING (true);
--   alter policy "Manage Production Items" on public.seapod_items USING (true);
--   alter policy "Manage Production" on public.seapod_production USING (true);
--   alter policy "Read All Template Items" on public.seapod_template_items USING (true);
--   alter policy "Read All Templates" on public.seapod_templates USING (true);
--   alter policy "Read Profiles" on public.profiles USING (true);
--   drop function public.has_portal_role();

create or replace function public.has_portal_role()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'operation', 'vendor', 'management')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'pending');
  return new;
end;
$$;

alter policy "Read Items" on public.items USING (public.has_portal_role());
alter policy "Enable all access for auth users" on public.kit_items USING (public.has_portal_role());
alter policy "Read Kit Items" on public.kit_items USING (public.has_portal_role());
alter policy "Enable all access for auth users" on public.kits USING (public.has_portal_role());
alter policy "Read Kits" on public.kits USING (public.has_portal_role());
alter policy "Allow all access for auth users" on public.order_files USING (public.has_portal_role()) WITH CHECK (public.has_portal_role());
alter policy "Manage Files" on public.order_files USING (public.has_portal_role());
alter policy "Manage Items" on public.order_items USING (public.has_portal_role());
alter policy "Enable insert for all auth users" on public.orders WITH CHECK (public.has_portal_role());
alter policy "Read Orders" on public.orders USING (public.has_portal_role());
alter policy "Update Orders" on public.orders USING (public.has_portal_role());
alter policy "Manage Seapod Files" on public.seapod_files USING (public.has_portal_role());
alter policy "Manage Production Items" on public.seapod_items USING (public.has_portal_role());
alter policy "Manage Production" on public.seapod_production USING (public.has_portal_role());
alter policy "Read All Template Items" on public.seapod_template_items USING (public.has_portal_role());
alter policy "Read All Templates" on public.seapod_templates USING (public.has_portal_role());
alter policy "Read Profiles" on public.profiles USING (id = auth.uid() or public.has_portal_role());
