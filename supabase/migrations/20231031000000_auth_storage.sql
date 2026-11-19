-- Create documents table
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    filename text not null,
    storage_path text, -- ADDED STORAGE PATH
    mime_type text not null,
    size integer not null,
    text_content text not null,
    requires_ocr boolean default false,
    page_count integer,
    indexing_status text default 'pending',
    content_hash text,
    config_version text,
    uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies for documents
alter table public.documents enable row level security;

create policy "Users can view their own documents"
    on public.documents for select
    using (auth.uid() = user_id);

create policy "Users can insert their own documents"
    on public.documents for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own documents"
    on public.documents for update
    using (auth.uid() = user_id);

create policy "Users can delete their own documents"
    on public.documents for delete
    using (auth.uid() = user_id);

-- Storage bucket for documents
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Users can upload their own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own documents"
  on storage.objects for update
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
