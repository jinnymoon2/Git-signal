create extension if not exists "uuid-ossp";

create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  github_id bigint unique not null,
  github_username text not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade,
  encrypted_github_token text not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

create table if not exists repositories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade,
  github_repo_id bigint not null,
  name text not null,
  full_name text not null,
  description text,
  primary_language text,
  stars integer default 0,
  forks integer default 0,
  is_private boolean default false,
  github_created_at timestamp with time zone,
  github_updated_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, github_repo_id)
);

create table if not exists analysis_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete cascade,
  status text not null default 'queued',
  error_message text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

create table if not exists repository_snapshots (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references analysis_jobs(id) on delete cascade,
  repository_id uuid references repositories(id) on delete cascade,
  commit_count integer default 0,
  active_days integer default 0,
  active_weeks integer default 0,
  first_commit_at timestamp with time zone,
  last_commit_at timestamp with time zone,
  languages jsonb default '{}',
  commit_type_counts jsonb default '{}',
  created_at timestamp with time zone default now()
);

create table if not exists developer_reports (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references analysis_jobs(id) on delete cascade,
  user_id uuid references app_users(id) on delete cascade,
  developer_type text not null,
  scores jsonb not null,
  summary text not null,
  strengths jsonb default '[]',
  recommendations jsonb default '[]',
  created_at timestamp with time zone default now()
);