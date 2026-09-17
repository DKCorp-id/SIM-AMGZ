-- Invite / reset password tokens (password never stored or shown)
create table if not exists access_token (
  id text primary key,
  user_id text not null,
  email text not null,
  token_hash text not null unique,
  kind text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists access_token_hash_idx on access_token (token_hash);
create index if not exists access_token_user_idx on access_token (user_id);
