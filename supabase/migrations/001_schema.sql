-- ============================================================
-- CHIEF BY WALKER SPORTS - SUPABASE SCHEMA
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text default 'trial' check (plan in ('trial','starter','pro','elite')),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text default 'trialing',
  tracks_limit int default 3,
  cars_limit int default 2,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  logo_url text,
  is_private boolean default true,
  created_at timestamptz default now()
);

create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','crew_chief','mechanic','driver','viewer')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
create policy "Team members can view teams" on public.teams for select using (
  auth.uid() = owner_id or
  exists (select 1 from public.team_members where team_id = teams.id and user_id = auth.uid())
);
create policy "Owners can manage teams" on public.teams for all using (auth.uid() = owner_id);

-- ============================================================
-- TRACKS
-- ============================================================
create table public.tracks (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  state text,
  surface text check (surface in ('dirt','pavement','both')),
  type text check (type in ('oval','road_course','karting','drag')),
  length_miles numeric(5,3),
  banking_degrees numeric(5,2),
  notes text,
  is_global boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Pre-seed global tracks
insert into public.tracks (name, location, state, surface, type, length_miles, is_global) values
  ('Eldora Speedway', 'New Weston', 'OH', 'dirt', 'oval', 0.5, true),
  ('Knoxville Raceway', 'Knoxville', 'IA', 'dirt', 'oval', 0.5, true),
  ('Williams Grove Speedway', 'Mechanicsburg', 'PA', 'dirt', 'oval', 0.5, true),
  ('Dirt Track at Charlotte', 'Concord', 'NC', 'dirt', 'oval', 0.25, true),
  ('Volusia Speedway Park', 'Barberville', 'FL', 'dirt', 'oval', 0.5, true),
  ('Huset''s Speedway', 'Brandon', 'SD', 'dirt', 'oval', 0.375, true),
  ('Federated Auto Parts Raceway at I-55', 'Pevely', 'MO', 'dirt', 'oval', 0.5, true),
  ('Bristol Motor Speedway', 'Bristol', 'TN', 'pavement', 'oval', 0.533, true),
  ('Lucas Oil Indianapolis Raceway Park', 'Brownsburg', 'IN', 'pavement', 'oval', 0.686, true),
  ('Watkins Glen International', 'Watkins Glen', 'NY', 'pavement', 'road_course', 3.4, true),
  ('iRacing Eldora', 'iRacing', 'Sim', 'dirt', 'oval', 0.5, true),
  ('iRacing Bristol', 'iRacing', 'Sim', 'pavement', 'oval', 0.533, true),
  ('iRacing Knoxville', 'iRacing', 'Sim', 'dirt', 'oval', 0.5, true),
  ('iRacing Williams Grove', 'iRacing', 'Sim', 'dirt', 'oval', 0.5, true),
  ('iRacing Watkins Glen', 'iRacing', 'Sim', 'pavement', 'road_course', 3.4, true);

alter table public.tracks enable row level security;
create policy "Anyone can view global tracks" on public.tracks for select using (is_global = true or created_by = auth.uid());
create policy "Users can create tracks" on public.tracks for insert with check (auth.uid() = created_by);

-- ============================================================
-- CARS
-- ============================================================
create table public.cars (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  number text,
  type text not null check (type in (
    'dirt_late_model',
    'pavement_late_model', 
    'wing_sprint',
    'non_wing_sprint',
    'wing_micro',
    'non_wing_micro',
    'dirt_modified',
    'street_stock',
    'sim_iracing',
    'sim_ac',
    'sim_rf2',
    'sim_ams2',
    'sim_gt7',
    'sim_f1_game',
    'sim_dirt_iracing'
  )),
  is_sim boolean default false,
  make text,
  model text,
  engine text,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.cars enable row level security;
create policy "Users can manage own cars" on public.cars for all using (auth.uid() = user_id);

-- ============================================================
-- SETUP SHEETS (Race Chief)
-- ============================================================
create table public.setup_sheets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  car_id uuid references public.cars(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  car_type text not null,
  event_date date,
  conditions jsonb default '{}',

  -- Tires
  tire_brand text,
  tire_compound text,
  lf_cold_psi numeric(5,1), rf_cold_psi numeric(5,1),
  lr_cold_psi numeric(5,1), rr_cold_psi numeric(5,1),
  lf_hot_psi numeric(5,1), rf_hot_psi numeric(5,1),
  lr_hot_psi numeric(5,1), rr_hot_psi numeric(5,1),
  lf_duro numeric(5,1), rf_duro numeric(5,1),
  lr_duro numeric(5,1), rr_duro numeric(5,1),
  lf_temp_in numeric(5,1), lf_temp_mid numeric(5,1), lf_temp_out numeric(5,1),
  rf_temp_in numeric(5,1), rf_temp_mid numeric(5,1), rf_temp_out numeric(5,1),
  lr_temp_in numeric(5,1), lr_temp_mid numeric(5,1), lr_temp_out numeric(5,1),
  rr_temp_in numeric(5,1), rr_temp_mid numeric(5,1), rr_temp_out numeric(5,1),

  -- Stagger
  front_stagger numeric(5,2),
  rear_stagger numeric(5,2),

  -- Ride Heights
  lf_ride_height numeric(5,2), rf_ride_height numeric(5,2),
  lr_ride_height numeric(5,2), rr_ride_height numeric(5,2),

  -- Chassis/Frame Heights
  lf_frame_height numeric(5,2), rf_frame_height numeric(5,2),
  lr_frame_height numeric(5,2), rr_frame_height numeric(5,2),

  -- Springs
  lf_spring numeric(6,0), rf_spring numeric(6,0),
  lr_spring numeric(6,0), rr_spring numeric(6,0),

  -- Shocks (coilover or torsion)
  lf_shock_comp int, rf_shock_comp int,
  lr_shock_comp int, rr_shock_comp int,
  lf_shock_reb int, rf_shock_reb int,
  lr_shock_reb int, rr_shock_reb int,
  shock_travel_lf numeric(5,2), shock_travel_rf numeric(5,2),
  shock_travel_lr numeric(5,2), shock_travel_rr numeric(5,2),

  -- Torsion bars (sprint/micro)
  lf_torsion_bar numeric(5,3), rf_torsion_bar numeric(5,3),
  lr_torsion_bar numeric(5,3), rr_torsion_bar numeric(5,3),
  lf_torsion_arm_angle numeric(5,1), rf_torsion_arm_angle numeric(5,1),
  lr_torsion_arm_angle numeric(5,1), rr_torsion_arm_angle numeric(5,1),

  -- Alignment
  lf_caster numeric(5,2), rf_caster numeric(5,2),
  lf_camber numeric(5,2), rf_camber numeric(5,2),
  lr_camber numeric(5,2), rr_camber numeric(5,2),
  front_toe numeric(5,3), rear_toe numeric(5,3),

  -- Sway bars
  front_sway_bar_size numeric(5,3),
  front_sway_bar_arm text,
  rear_sway_bar_size numeric(5,3),
  rear_sway_bar_arm text,

  -- Wings (sprint cars)
  front_wing_angle numeric(5,1),
  rear_wing_angle numeric(5,1),
  front_wing_offset text,
  rear_wing_side_boards text,

  -- Weights
  lf_weight numeric(6,1), rf_weight numeric(6,1),
  lr_weight numeric(6,1), rr_weight numeric(6,1),
  total_weight numeric(7,1),
  left_side_pct numeric(5,2),
  cross_weight_pct numeric(5,2),
  front_weight_pct numeric(5,2),

  -- Bite / Wedge
  wedge_turns numeric(5,2),
  lr_bite numeric(5,2),
  rr_bite numeric(5,2),

  -- Gear / Brakes
  gear_ratio text,
  brake_bias numeric(5,2),
  brake_pressure text,

  -- Block Heights
  lf_block_height numeric(5,3), rf_block_height numeric(5,3),
  lr_block_height numeric(5,3), rr_block_height numeric(5,3),

  -- Rear geometry
  lr_trailing_arm_angle numeric(5,2), rr_trailing_arm_angle numeric(5,2),
  panhard_bar_lr numeric(5,2), panhard_bar_rr numeric(5,2),
  j_bar_height numeric(5,2),
  birdcage_offset text,

  -- Driver notes
  driver_feel_before text,
  driver_feel_after text,

  -- Results
  best_lap_time numeric(8,3),
  feature_finish text,
  heat_finish text,
  qualifying_time numeric(8,3),
  qualifying_position int,

  -- Meta
  is_baseline boolean default false,
  notes text,
  chief_recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.setup_sheets enable row level security;
create policy "Users can manage own setup sheets" on public.setup_sheets for all using (auth.uid() = user_id);

-- ============================================================
-- SIM SETUPS
-- ============================================================
create table public.sim_setups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  car_id uuid references public.cars(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  name text not null,
  sim_platform text check (sim_platform in ('iracing','assetto_corsa','rf2','ams2','gt7','f1_game','dirt_iracing','other')),
  car_class text,
  session_type text check (session_type in ('practice','qualifying','race','test')),
  event_date date,

  -- Force Feedback
  ffb_overall numeric(5,1),
  ffb_damping numeric(5,1),
  ffb_smoothing numeric(5,1),
  ffb_intensity numeric(5,1),
  ffb_min_force numeric(5,1),
  steering_ratio numeric(5,1),
  steering_lock numeric(5,1),

  -- Aero
  front_downforce int,
  rear_downforce int,
  front_wing_angle numeric(5,1),
  rear_wing_angle numeric(5,1),
  ride_height_f numeric(5,1),
  ride_height_r numeric(5,1),

  -- Suspension
  lf_spring_rate numeric(6,1), rf_spring_rate numeric(6,1),
  lr_spring_rate numeric(6,1), rr_spring_rate numeric(6,1),
  lf_bump int, rf_bump int, lr_bump int, rr_bump int,
  lf_rebound int, rf_rebound int, lr_rebound int, rr_rebound int,
  front_arb int, rear_arb int,
  front_preload numeric(5,2), rear_preload numeric(5,2),

  -- Alignment
  lf_camber numeric(5,2), rf_camber numeric(5,2),
  lr_camber numeric(5,2), rr_camber numeric(5,2),
  front_toe numeric(5,3), rear_toe numeric(5,3),
  front_caster numeric(5,2),

  -- Tires
  lf_psi numeric(5,1), rf_psi numeric(5,1),
  lr_psi numeric(5,1), rr_psi numeric(5,1),
  tire_compound text,

  -- Brakes / Transmission
  brake_bias numeric(5,2),
  brake_pressure numeric(5,1),
  gear_ratios jsonb default '{}',
  fuel_load numeric(6,2),

  -- Dirt sim specific
  stagger_front numeric(5,2),
  stagger_rear numeric(5,2),
  bite_lr numeric(5,2),
  bite_rr numeric(5,2),
  weight_jacker text,

  -- Results
  best_lap_time numeric(8,3),
  irating_change int,
  safety_rating_change numeric(5,2),
  incidents int,
  finish_position int,

  -- Driver feedback
  driver_feel text,
  loose_tight_entry text check (loose_tight_entry in ('very_loose','loose','neutral','tight','very_tight')),
  loose_tight_center text check (loose_tight_center in ('very_loose','loose','neutral','tight','very_tight')),
  loose_tight_exit text check (loose_tight_exit in ('very_loose','loose','neutral','tight','very_tight')),

  -- AI
  chief_recommendation text,
  screenshot_urls text[] default '{}',

  notes text,
  is_baseline boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sim_setups enable row level security;
create policy "Users can manage own sim setups" on public.sim_setups for all using (auth.uid() = user_id);

-- ============================================================
-- SETUP CHANGES (delta log)
-- ============================================================
create table public.setup_changes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  setup_sheet_id uuid references public.setup_sheets(id) on delete cascade,
  sim_setup_id uuid references public.sim_setups(id) on delete cascade,
  car_id uuid references public.cars(id),
  track_id uuid references public.tracks(id),
  field_changed text not null,
  old_value text,
  new_value text,
  reason text,
  outcome text check (outcome in ('improved','no_change','worse','unknown')),
  lap_time_delta numeric(8,3),
  driver_feel_delta text,
  notes text,
  created_at timestamptz default now()
);

alter table public.setup_changes enable row level security;
create policy "Users can manage own changes" on public.setup_changes for all using (auth.uid() = user_id);

-- ============================================================
-- MAINTENANCE SHEETS (Race Chief)
-- ============================================================
create table public.maintenance_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  car_id uuid references public.cars(id) on delete cascade,
  team_id uuid references public.teams(id),
  maintenance_type text check (maintenance_type in (
    'engine','transmission','rear_end','brakes','suspension',
    'body','safety','tires','fuel_system','electrical','pre_race','post_race','inspection','other'
  )),
  title text not null,
  description text,
  parts_used jsonb default '[]',
  labor_hours numeric(5,2),
  cost numeric(8,2),
  mileage_laps int,
  completed_by text,
  next_service_laps int,
  next_service_date date,
  priority text check (priority in ('low','medium','high','critical')) default 'medium',
  status text check (status in ('pending','in_progress','done','deferred')) default 'pending',
  photos text[] default '{}',
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.maintenance_logs enable row level security;
create policy "Users can manage own maintenance" on public.maintenance_logs for all using (auth.uid() = user_id);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
create table public.ai_conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  mode text check (mode in ('race_chief','sim_chief','general')) default 'general',
  title text,
  context_setup_id uuid,
  context_track_id uuid references public.tracks(id),
  context_car_id uuid references public.cars(id),
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;
create policy "Users can manage own conversations" on public.ai_conversations for all using (auth.uid() = user_id);

-- ============================================================
-- IMAGE UPLOADS
-- ============================================================
create table public.uploads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bucket_path text not null,
  public_url text,
  file_type text,
  file_size int,
  context_type text check (context_type in ('setup_screenshot','tire_data','maintenance','track_map','general')),
  context_id uuid,
  ai_analysis text,
  created_at timestamptz default now()
);

alter table public.uploads enable row level security;
create policy "Users can manage own uploads" on public.uploads for all using (auth.uid() = user_id);

-- ============================================================
-- TRACK HISTORY (chief memory - what worked where)
-- ============================================================
create table public.track_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  track_id uuid references public.tracks(id) not null,
  car_id uuid references public.cars(id),
  setup_sheet_id uuid references public.setup_sheets(id),
  sim_setup_id uuid references public.sim_setups(id),
  event_date date,
  best_lap_time numeric(8,3),
  finish_position int,
  total_cars int,
  conditions text,
  key_changes text,
  what_worked text,
  what_didnt_work text,
  chief_notes text,
  created_at timestamptz default now()
);

alter table public.track_history enable row level security;
create policy "Users can manage own track history" on public.track_history for all using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('chief-uploads', 'chief-uploads', true);
-- create policy "Users can upload" on storage.objects for insert with check (bucket_id = 'chief-uploads' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Public read" on storage.objects for select using (bucket_id = 'chief-uploads');

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_setup_sheets_user_id on public.setup_sheets(user_id);
create index idx_setup_sheets_car_track on public.setup_sheets(car_id, track_id);
create index idx_sim_setups_user_id on public.sim_setups(user_id);
create index idx_sim_setups_car_track on public.sim_setups(car_id, track_id);
create index idx_setup_changes_user_car_track on public.setup_changes(user_id, car_id, track_id);
create index idx_track_history_user_track on public.track_history(user_id, track_id);
create index idx_maintenance_car on public.maintenance_logs(car_id);
