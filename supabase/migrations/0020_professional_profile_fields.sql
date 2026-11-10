alter table public.profiles
  add column if not exists location text,
  add column if not exists website_url text,
  add column if not exists github_url text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists certifications text,
  add column if not exists projects text,
  add column if not exists experience text,
  add column if not exists education text;
