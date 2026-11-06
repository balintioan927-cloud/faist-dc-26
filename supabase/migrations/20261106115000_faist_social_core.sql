-- FAIST DC 26 social backend
-- Apply only to a dedicated Supabase project for this social app.
-- Do not apply to the existing FAIST WORK project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9._-]{3,30}$'),
  full_name text not null default '' check (char_length(full_name) <= 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  image_path text,
  visibility text not null default 'public'
    check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists comments_post_created_idx on public.post_comments (post_id, created_at);
create index if not exists likes_user_idx on public.post_likes (user_id);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists messages_conversation_created_idx on public.direct_messages (conversation_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_faist_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-z0-9._-]', '', 'g'));
  v_username := left(v_username, 30);

  if char_length(v_username) < 3
     or exists (select 1 from public.profiles p where p.username = v_username) then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    v_username,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_faist on auth.users;
create trigger on_auth_user_created_faist
after insert on auth.users
for each row execute function public.handle_new_faist_user();

create or replace function public.can_view_faist_post(p_author_id uuid, p_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_author_id = auth.uid()
    or p_visibility = 'public'
    or (
      p_visibility = 'followers'
      and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = p_author_id
      )
    )
  );
$$;

create or replace function public.is_faist_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_faist_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.created_by = auth.uid()
  );
$$;

revoke all on function public.handle_new_faist_user() from public;
revoke all on function public.can_view_faist_post(uuid, text) from public;
revoke all on function public.is_faist_conversation_member(uuid) from public;
revoke all on function public.is_faist_conversation_creator(uuid) from public;
grant execute on function public.can_view_faist_post(uuid, text) to authenticated;
grant execute on function public.is_faist_conversation_member(uuid) to authenticated;
grant execute on function public.is_faist_conversation_creator(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages enable row level security;

revoke all on public.profiles, public.posts, public.post_likes,
  public.post_comments, public.follows, public.conversations,
  public.conversation_members, public.direct_messages
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_comments to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.conversation_members to authenticated;
grant select, insert, delete on public.direct_messages to authenticated;

create policy "FAIST authenticated profiles readable"
on public.profiles for select to authenticated
using (true);

create policy "FAIST users update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "FAIST visible posts readable"
on public.posts for select to authenticated
using (public.can_view_faist_post(author_id, visibility));

create policy "FAIST users create own posts"
on public.posts for insert to authenticated
with check (author_id = auth.uid());

create policy "FAIST authors update own posts"
on public.posts for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "FAIST authors delete own posts"
on public.posts for delete to authenticated
using (author_id = auth.uid());

create policy "FAIST visible likes readable"
on public.post_likes for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and public.can_view_faist_post(p.author_id, p.visibility)
  )
);

create policy "FAIST users add own likes"
on public.post_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id
      and public.can_view_faist_post(p.author_id, p.visibility)
  )
);

create policy "FAIST users remove own likes"
on public.post_likes for delete to authenticated
using (user_id = auth.uid());

create policy "FAIST visible comments readable"
on public.post_comments for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and public.can_view_faist_post(p.author_id, p.visibility)
  )
);

create policy "FAIST users add own comments"
on public.post_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id
      and public.can_view_faist_post(p.author_id, p.visibility)
  )
);

create policy "FAIST authors delete own comments"
on public.post_comments for delete to authenticated
using (author_id = auth.uid());

create policy "FAIST users read follows"
on public.follows for select to authenticated
using (true);

create policy "FAIST users follow from own account"
on public.follows for insert to authenticated
with check (follower_id = auth.uid() and follower_id <> following_id);

create policy "FAIST users unfollow from own account"
on public.follows for delete to authenticated
using (follower_id = auth.uid());

create policy "FAIST members read conversations"
on public.conversations for select to authenticated
using (public.is_faist_conversation_member(id));

create policy "FAIST users create conversations"
on public.conversations for insert to authenticated
with check (created_by = auth.uid());

create policy "FAIST members read conversation members"
on public.conversation_members for select to authenticated
using (public.is_faist_conversation_member(conversation_id));

create policy "FAIST creator adds conversation members"
on public.conversation_members for insert to authenticated
with check (public.is_faist_conversation_creator(conversation_id));

create policy "FAIST members read private messages"
on public.direct_messages for select to authenticated
using (public.is_faist_conversation_member(conversation_id));

create policy "FAIST members send own private messages"
on public.direct_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_faist_conversation_member(conversation_id)
);

create policy "FAIST senders delete own private messages"
on public.direct_messages for delete to authenticated
using (
  sender_id = auth.uid()
  and public.is_faist_conversation_member(conversation_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'faist-photos',
  'faist-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "FAIST users upload own photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'faist-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "FAIST users read allowed photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'faist-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.avatar_path = name
    )
    or exists (
      select 1 from public.posts p
      where p.image_path = name
        and public.can_view_faist_post(p.author_id, p.visibility)
    )
  )
);

create policy "FAIST users update own photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'faist-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'faist-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "FAIST users delete own photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'faist-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
