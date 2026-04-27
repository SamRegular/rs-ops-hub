-- ─── Teams & Workspaces ─────────────────────────────────────────────────────
-- Every user belongs to a team; all data is team-scoped

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null,
  role text default 'member', -- 'admin' or 'member'
  created_at timestamp default now(),
  unique(team_id, user_id)
);

alter table team_members enable row level security;
create policy "Users can see their own team membership"
  on team_members for select using (user_id = auth.uid());
create policy "Users can see team members in their team"
  on team_members for select using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- ─── Clients ────────────────────────────────────────────────────────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  sector text,
  source text,
  address text,
  notes text,
  "pipelineStage" text default 'Lead',
  "lastContactDate" date,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table clients enable row level security;
create policy "Users can see clients in their team"
  on clients for select using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can create clients in their team"
  on clients for insert with check (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can update clients in their team"
  on clients for update using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can delete clients in their team"
  on clients for delete using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- ─── Projects ───────────────────────────────────────────────────────────────

create table projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  "clientId" uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  "projectType" text,
  status text default 'Lead', -- Lead, Quoted, Confirmed, Active, Complete, Lost
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table projects enable row level security;
create policy "Users can see projects in their team"
  on projects for select using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can create projects in their team"
  on projects for insert with check (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can update projects in their team"
  on projects for update using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can delete projects in their team"
  on projects for delete using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- ─── Deliverables (per project) ──────────────────────────────────────────────

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamp default now()
);

alter table deliverables enable row level security;
create policy "Users can see deliverables in their team projects"
  on deliverables for select using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can create deliverables in their team projects"
  on deliverables for insert with check (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can update deliverables in their team projects"
  on deliverables for update using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can delete deliverables in their team projects"
  on deliverables for delete using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );

-- ─── Payment Tranches ───────────────────────────────────────────────────────

create table payment_tranches (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references projects(id) on delete cascade,
  label text not null,
  month text not null, -- YYYY-MM format
  amount numeric not null,
  created_at timestamp default now()
);

alter table payment_tranches enable row level security;
create policy "Users can see payment tranches in their team projects"
  on payment_tranches for select using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can create payment tranches in their team projects"
  on payment_tranches for insert with check (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can update payment tranches in their team projects"
  on payment_tranches for update using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );
create policy "Users can delete payment tranches in their team projects"
  on payment_tranches for delete using (
    "projectId" in (
      select id from projects where team_id in (
        select team_id from team_members where user_id = auth.uid()
      )
    )
  );

-- ─── Documents (Quotes, SOWs, Invoices) ──────────────────────────────────────

create table documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  "clientId" uuid not null references clients(id) on delete cascade,
  "projectId" uuid references projects(id) on delete set null,
  type text not null, -- 'quote', 'sow', 'invoice'
  "invoiceNumber" text,
  "projectName" text,
  status text default 'draft', -- draft, sent, accepted, paid, etc.
  total numeric,
  content text, -- markdown/HTML content
  deliverables jsonb default '[]'::jsonb, -- stored as JSON array
  "paymentTranches" jsonb default '[]'::jsonb, -- stored as JSON array
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table documents enable row level security;
create policy "Users can see documents in their team"
  on documents for select using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can create documents in their team"
  on documents for insert with check (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can update documents in their team"
  on documents for update using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can delete documents in their team"
  on documents for delete using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- ─── Retainers ──────────────────────────────────────────────────────────────

create table retainers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  "clientId" uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  "monthlyFee" numeric not null,
  "startDate" date not null,
  "endDate" date,
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table retainers enable row level security;
create policy "Users can see retainers in their team"
  on retainers for select using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can create retainers in their team"
  on retainers for insert with check (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can update retainers in their team"
  on retainers for update using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
create policy "Users can delete retainers in their team"
  on retainers for delete using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- ─── Indexes (for performance) ──────────────────────────────────────────────

create index idx_clients_team_id on clients(team_id);
create index idx_projects_team_id on projects(team_id);
create index idx_projects_client_id on projects("clientId");
create index idx_documents_team_id on documents(team_id);
create index idx_documents_client_id on documents("clientId");
create index idx_documents_project_id on documents("projectId");
create index idx_retainers_team_id on retainers(team_id);
create index idx_retainers_client_id on retainers("clientId");
create index idx_team_members_user_id on team_members(user_id);
create index idx_team_members_team_id on team_members(team_id);
