-- Create document_insights table
create table if not exists public.document_insights (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    summary text not null,
    entities jsonb not null default '[]'::jsonb,
    dates jsonb not null default '[]'::jsonb,
    content_hash text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies for document_insights
alter table public.document_insights enable row level security;

create policy "Users can view their own document insights"
    on public.document_insights for select
    using (auth.uid() = user_id);

create policy "Users can insert their own document insights"
    on public.document_insights for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own document insights"
    on public.document_insights for update
    using (auth.uid() = user_id);

create policy "Users can delete their own document insights"
    on public.document_insights for delete
    using (auth.uid() = user_id);

-- Create chat_sessions table
create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies for chat_sessions
alter table public.chat_sessions enable row level security;

create policy "Users can view their own chat sessions"
    on public.chat_sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own chat sessions"
    on public.chat_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own chat sessions"
    on public.chat_sessions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own chat sessions"
    on public.chat_sessions for delete
    using (auth.uid() = user_id);

-- Create chat_messages table
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    evidence jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies for chat_messages
alter table public.chat_messages enable row level security;

create policy "Users can view their own chat messages"
    on public.chat_messages for select
    using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
    on public.chat_messages for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own chat messages"
    on public.chat_messages for update
    using (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
    on public.chat_messages for delete
    using (auth.uid() = user_id);
