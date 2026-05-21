insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', false)
on conflict (id) do nothing;

create policy "Users can read their trade image objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload their trade image objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their trade image objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their trade image objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
