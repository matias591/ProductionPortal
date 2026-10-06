-- Storage write policies only checked bucket_id for any `authenticated` user. A 'pending'
-- (self-registered, unapproved) user could upload/replace/delete attachments. Require a known role.
-- Service-role callers bypass RLS. Reads are unchanged (both buckets are public).
--
-- Rollback:
--   alter policy "Allow Auth Uploads Seapod" on storage.objects with check (bucket_id = 'seapod-attachments'::text);
--   alter policy "Allow Authenticated Uploads" on storage.objects with check (bucket_id = 'order-attachments'::text);
--   alter policy "Allow Authenticated Updates" on storage.objects using (bucket_id = 'order-attachments'::text);
--   alter policy "Allow Authenticated Deletes" on storage.objects using (bucket_id = 'order-attachments'::text);

alter policy "Allow Auth Uploads Seapod" on storage.objects
  with check (bucket_id = 'seapod-attachments'::text and public.has_portal_role());
alter policy "Allow Authenticated Uploads" on storage.objects
  with check (bucket_id = 'order-attachments'::text and public.has_portal_role());
alter policy "Allow Authenticated Updates" on storage.objects
  using (bucket_id = 'order-attachments'::text and public.has_portal_role());
alter policy "Allow Authenticated Deletes" on storage.objects
  using (bucket_id = 'order-attachments'::text and public.has_portal_role());
