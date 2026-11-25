create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  company text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists company text;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'company', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  division text not null,
  name text not null,
  description text not null,
  base_price numeric(12,2) not null check (base_price > 0),
  config jsonb not null default '{}'::jsonb,
  volume_discount_threshold integer not null default 100,
  discount_percent numeric(5,2) not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists updated_at timestamptz not null default now();

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  template_type text not null check (template_type in ('design', 'production')),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  description text not null default '',
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute procedure public.touch_updated_at();

drop trigger if exists templates_touch_updated_at on public.templates;
create trigger templates_touch_updated_at
  before update on public.templates
  for each row execute procedure public.touch_updated_at();

create index if not exists templates_active_type_product_idx
  on public.templates (template_type, product_id, active, updated_at desc);

insert into public.templates (id, template_type, name, description, content, active)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'design',
    'Bold starter',
    'A centered, high-contrast starting point for customer artwork.',
    '{"text":"YOUR TEXT","color":"#f97316","font_size":22,"position":{"x":50,"y":50,"rotation":0}}'::jsonb,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'production',
    'Standard 3 mm bleed · 300 DPI',
    'Default MVP export settings for newly created quotes.',
    '{"bleed_mm":3,"dpi":300}'::jsonb,
    true
  )
on conflict (id) do nothing;

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null default 'Untitled design',
  content jsonb not null default '{}'::jsonb,
  artwork_url text,
  status text not null default 'draft' check (status in ('draft', 'saved', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  design_id uuid references public.designs(id) on delete set null,
  configuration jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null check (total >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'mock_paid', 'paid', 'failed')),
  payment_method text check (payment_method is null or payment_method in ('bank_transfer', 'upi', 'cash', 'other')),
  payment_reference text,
  payment_recorded_by uuid references public.profiles(id) on delete set null,
  payment_recorded_at timestamptz,
  status text not null default 'order' check (status in ('quote', 'order', 'artwork', 'proof', 'production', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null check (version > 0),
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'changes_requested', 'approved')),
  customer_note text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, version)
);

create table if not exists public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('artwork', 'proof', 'pdf', 'png', 'csv', 'receipt')),
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists payment_method text check (payment_method is null or payment_method in ('bank_transfer', 'upi', 'cash', 'other'));
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_recorded_by uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists payment_recorded_at timestamptz;
alter table public.orders alter column payment_status set default 'pending';

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.templates enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;
alter table public.proofs enable row level security;
alter table public.order_files enable row level security;

drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read" on public.profiles
for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id and role = 'customer');

drop policy if exists "admins update customer profiles" on public.profiles;
create policy "admins update customer profiles" on public.profiles
for update using (public.is_admin() and role = 'customer')
with check (public.is_admin() and role = 'customer');

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products" on public.products
for select using (active = true or public.is_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active design templates" on public.templates;
create policy "public read active design templates" on public.templates
for select using ((template_type = 'design' and active = true) or public.is_admin());

drop policy if exists "admins manage templates" on public.templates;
create policy "admins manage templates" on public.templates
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "owners and admins manage designs" on public.designs;
drop policy if exists "customers and admins read designs" on public.designs;
create policy "customers and admins read designs" on public.designs
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admins manage designs" on public.designs;
create policy "admins manage designs" on public.designs
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers and admins read orders" on public.orders;
create policy "customers and admins read orders" on public.orders
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "customers create own orders" on public.orders;

drop policy if exists "admins update orders" on public.orders;

drop policy if exists "customers and admins read proofs" on public.proofs;
create policy "customers and admins read proofs" on public.proofs
for select using (
  public.is_admin() or exists (
    select 1 from public.orders where orders.id = proofs.order_id and orders.user_id = auth.uid()
  )
);

drop policy if exists "admins manage proofs" on public.proofs;
create policy "admins manage proofs" on public.proofs
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers and admins read files" on public.order_files;
create policy "customers and admins read files" on public.order_files
for select using (
  public.is_admin() or exists (
    select 1 from public.orders where orders.id = order_files.order_id and orders.user_id = auth.uid()
  )
);

drop policy if exists "admins manage files" on public.order_files;
create policy "admins manage files" on public.order_files
for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artwork',
  'artwork',
  false,
  15728640,
  array['application/pdf', 'application/postscript', 'application/octet-stream', 'image/jpeg', 'image/png', 'image/svg+xml', 'text/csv']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own artwork" on storage.objects;
create policy "users upload own artwork" on storage.objects
for insert to authenticated
with check (bucket_id = 'artwork' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own artwork" on storage.objects;
create policy "users delete own artwork" on storage.objects
for delete to authenticated
using (bucket_id = 'artwork' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users view own artwork" on storage.objects;
create policy "users view own artwork" on storage.objects
for select to authenticated
using (
  bucket_id = 'artwork'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (
      select 1
      from public.proofs as proof
      join public.orders as customer_order on customer_order.id = proof.order_id
      where proof.file_url = name and customer_order.user_id = auth.uid()
    )
  )
);

drop policy if exists "admins manage artwork" on storage.objects;
create policy "admins manage artwork" on storage.objects
for all to authenticated
using (bucket_id = 'artwork' and public.is_admin())
with check (bucket_id = 'artwork' and public.is_admin());

insert into public.products (slug, division, name, description, base_price, config, volume_discount_threshold, discount_percent)
values
  ('labels', 'Labels & Stickers', 'Custom Product Labels', 'Durable labels for products, packaging and promotions.', 5.50, '{"sizes":["50 × 50 mm","75 × 75 mm","100 × 100 mm"],"materials":["Matte vinyl","Gloss vinyl","Clear film"],"base_size":{"width":50,"height":50},"dimensions":{"min":20,"max":500},"material_factors":{"Matte vinyl":1,"Gloss vinyl":1.15,"Clear film":1.3},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10),
  ('race', 'Race & Event Numbers', 'Race Numbers', 'Weather-ready variable-data event numbers.', 18.00, '{"sizes":["A5","A4","A3"],"materials":["Tyvek","Synthetic paper","Reflective stock"],"base_size":{"width":148,"height":210},"dimensions":{"min":80,"max":600},"material_factors":{"Tyvek":1,"Synthetic paper":1.2,"Reflective stock":1.45},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10),
  ('mtb', 'MTB Boards', 'Custom MTB Boards', 'Durable race boards for riders and events.', 120.00, '{"sizes":["200 × 150 mm","250 × 180 mm","300 × 200 mm"],"materials":["PVC board","Correx board","Aluminium composite"],"base_size":{"width":200,"height":150},"dimensions":{"min":100,"max":600},"material_factors":{"PVC board":1,"Correx board":1.15,"Aluminium composite":1.8},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10),
  ('stamps', 'Stamps', 'Custom Stamps', 'Precise stamps for everyday business use.', 220.00, '{"sizes":["Small / 30 mm","Medium / 45 mm","Large / 60 mm"],"materials":["Self-inking","Wood handle","Heavy-duty"],"base_size":{"width":30,"height":30},"dimensions":{"min":15,"max":150},"material_factors":{"Self-inking":1,"Wood handle":1.1,"Heavy-duty":1.35},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10),
  ('trophies', 'Trophies', 'Custom Trophies', 'Personalised awards and recognition.', 420.00, '{"sizes":["150 mm","220 mm","300 mm"],"materials":["Acrylic","Metal cup","Crystal"],"base_size":{"width":100,"height":150},"dimensions":{"min":80,"max":500},"material_factors":{"Acrylic":1,"Metal cup":1.35,"Crystal":1.75},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10),
  ('laser', 'Laser-cut Work', 'Laser-cut Pieces', 'Detailed cut work for signage and retail.', 160.00, '{"sizes":["100 × 100 mm","200 × 200 mm","300 × 300 mm"],"materials":["Birch ply","Acrylic","MDF"],"base_size":{"width":100,"height":100},"dimensions":{"min":30,"max":1000},"material_factors":{"Birch ply":1,"Acrylic":1.25,"MDF":0.9},"volume_discounts":[{"minimum":100,"percent":10},{"minimum":500,"percent":18}]}'::jsonb, 100, 10)
on conflict (slug) do nothing;

create or replace function public.create_customer_order(
  p_product_slug text,
  p_quantity integer,
  p_width_mm numeric,
  p_height_mm numeric,
  p_material text,
  p_design_content jsonb default '{}'::jsonb
)
returns table (
  created_order_id uuid,
  created_order_number bigint,
  created_design_id uuid,
  calculated_unit_price numeric,
  calculated_subtotal numeric,
  calculated_discount numeric,
  calculated_vat numeric,
  calculated_total numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
  v_design_id uuid;
  v_order_id uuid;
  v_order_number bigint;
  v_design_name text;
  v_min_dimension numeric;
  v_max_dimension numeric;
  v_base_width numeric;
  v_base_height numeric;
  v_material_factor numeric;
  v_discount_rate numeric := 0;
  v_unit_price numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_vat numeric;
  v_total numeric;
  v_rows integer;
  v_production_template_id uuid;
  v_production_spec jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 1000000 then
    raise exception 'Quantity must be between 1 and 1000000' using errcode = '22023';
  end if;

  if p_width_mm is null or p_height_mm is null or p_width_mm <= 0 or p_height_mm <= 0 then
    raise exception 'Width and height must be positive dimensions' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_design_content, '{}'::jsonb)) <> 'object' then
    raise exception 'Design content must be a JSON object' using errcode = '22023';
  end if;

  select *
  into v_product
  from public.products
  where slug = p_product_slug and active = true;

  if not found then
    raise exception 'Product is unavailable' using errcode = '22023';
  end if;

  v_min_dimension := (v_product.config -> 'dimensions' ->> 'min')::numeric;
  v_max_dimension := (v_product.config -> 'dimensions' ->> 'max')::numeric;
  v_base_width := (v_product.config -> 'base_size' ->> 'width')::numeric;
  v_base_height := (v_product.config -> 'base_size' ->> 'height')::numeric;
  v_material_factor := (v_product.config -> 'material_factors' ->> p_material)::numeric;

  if v_min_dimension is null or v_max_dimension is null
    or v_base_width is null or v_base_height is null
    or v_base_width <= 0 or v_base_height <= 0 then
    raise exception 'Product pricing configuration is incomplete' using errcode = '22023';
  end if;

  if p_width_mm < v_min_dimension or p_width_mm > v_max_dimension
    or p_height_mm < v_min_dimension or p_height_mm > v_max_dimension then
    raise exception 'Requested dimensions are outside the printable range' using errcode = '22023';
  end if;

  if v_material_factor is null or v_material_factor <= 0 then
    raise exception 'Material is not available for this product' using errcode = '22023';
  end if;

  select coalesce(max((tier ->> 'percent')::numeric), 0)
  into v_discount_rate
  from jsonb_array_elements(coalesce(v_product.config -> 'volume_discounts', '[]'::jsonb)) as discounts(tier)
  where p_quantity >= (tier ->> 'minimum')::integer;

  if v_discount_rate = 0 and p_quantity >= v_product.volume_discount_threshold then
    v_discount_rate := v_product.discount_percent;
  end if;

  v_unit_price := round(
    v_product.base_price
      * sqrt((p_width_mm * p_height_mm) / (v_base_width * v_base_height))
      * v_material_factor,
    2
  );
  v_subtotal := round(v_unit_price * p_quantity, 2);
  v_discount := round(v_subtotal * v_discount_rate / 100, 2);
  v_vat := round((v_subtotal - v_discount) * 0.18, 2);
  v_total := v_subtotal - v_discount + v_vat;
  v_design_name := coalesce(nullif(btrim(p_design_content ->> 'name'), ''), v_product.name || ' design');

  select id, content
  into v_production_template_id, v_production_spec
  from public.templates
  where template_type = 'production'
    and active = true
    and (product_id = v_product.id or product_id is null)
  order by case when product_id = v_product.id then 1 else 0 end desc, updated_at desc
  limit 1;
  v_production_spec := coalesce(v_production_spec, '{"bleed_mm":3,"dpi":300}'::jsonb);

  insert into public.designs (user_id, product_id, name, content, status)
  values (auth.uid(), v_product.id, v_design_name, coalesce(p_design_content, '{}'::jsonb), 'saved')
  returning id into v_design_id;

  insert into public.orders (
    user_id,
    product_id,
    design_id,
    configuration,
    quantity,
    unit_price,
    subtotal,
    discount,
    vat,
    total,
    payment_status,
    status
  )
  values (
    auth.uid(),
    v_product.id,
    v_design_id,
    jsonb_build_object(
      'width_mm', p_width_mm,
      'height_mm', p_height_mm,
      'material', p_material,
      'production_template_id', v_production_template_id,
      'production_spec', v_production_spec
    ),
    p_quantity,
    v_unit_price,
    v_subtotal,
    v_discount,
    v_vat,
    v_total,
    'pending',
    'quote'
  )
  returning public.orders.id, public.orders.order_number
  into v_order_id, v_order_number;

  return query
  select v_order_id, v_order_number, v_design_id, v_unit_price, v_subtotal, v_discount, v_vat, v_total;
end;
$$;

revoke all on function public.create_customer_order(text, integer, numeric, numeric, text, jsonb) from public;
grant execute on function public.create_customer_order(text, integer, numeric, numeric, text, jsonb) to authenticated;

create or replace function public.respond_to_proof(
  p_proof_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Decision must be approved or changes_requested' using errcode = '22023';
  end if;

  if p_decision = 'changes_requested' and nullif(btrim(p_note), '') is null then
    raise exception 'Add a note describing the requested changes' using errcode = '22023';
  end if;

  update public.proofs as proof
  set
    status = p_decision,
    customer_note = case when p_decision = 'changes_requested' then nullif(btrim(p_note), '') else null end,
    approved_by = case when p_decision = 'approved' then auth.uid() else null end,
    approved_at = case when p_decision = 'approved' then now() else null end
  from public.orders as customer_order
  where proof.id = p_proof_id
    and customer_order.id = proof.order_id
    and customer_order.user_id = auth.uid()
    and proof.version = (
      select max(latest_proof.version)
      from public.proofs as latest_proof
      where latest_proof.order_id = proof.order_id
    )
    and proof.status in ('pending', 'changes_requested');

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Proof is unavailable, not the latest version, or already approved' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.respond_to_proof(uuid, text, text) from public;
grant execute on function public.respond_to_proof(uuid, text, text) to authenticated;

create or replace function public.advance_order_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
  v_payment_status text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_status not in ('quote', 'order', 'artwork', 'proof', 'production', 'completed') then
    raise exception 'Invalid order status' using errcode = '22023';
  end if;

  select payment_status
  into v_payment_status
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if p_status in ('production', 'completed') and v_payment_status not in ('paid', 'mock_paid') then
    raise exception 'Payment must be confirmed before production' using errcode = '23514';
  end if;

  if p_status in ('production', 'completed') and not exists (
    select 1
    from public.proofs as proof
    where proof.order_id = p_order_id
      and proof.version = (
        select max(latest_proof.version)
        from public.proofs as latest_proof
        where latest_proof.order_id = p_order_id
      )
      and proof.status = 'approved'
  ) then
    raise exception 'The latest proof must be approved before production' using errcode = '23514';
  end if;

  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.advance_order_status(uuid, text) from public;
grant execute on function public.advance_order_status(uuid, text) to authenticated;

create or replace function public.record_manual_payment(
  p_order_id uuid,
  p_method text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_method is null or p_method not in ('bank_transfer', 'upi', 'cash', 'other') then
    raise exception 'Select a supported manual payment method' using errcode = '22023';
  end if;

  if p_reference is null or length(btrim(p_reference)) < 2 or length(btrim(p_reference)) > 120 then
    raise exception 'Payment reference is required and must be 2 to 120 characters' using errcode = '22023';
  end if;

  update public.orders
  set payment_status = 'paid',
      payment_method = p_method,
      payment_reference = btrim(p_reference),
      payment_recorded_by = auth.uid(),
      payment_recorded_at = now(),
      updated_at = now()
  where id = p_order_id
    and payment_status in ('pending', 'failed')
    and status not in ('production', 'completed');

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Order not found or payment is not pending' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.record_manual_payment(uuid, text, text) from public;
grant execute on function public.record_manual_payment(uuid, text, text) to authenticated;

create or replace function public.attach_customer_artwork(
  p_order_id uuid,
  p_file_path text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_design_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_file_path is null
    or left(p_file_path, length(auth.uid()::text || '/' || p_order_id::text || '/artwork/'))
      <> (auth.uid()::text || '/' || p_order_id::text || '/artwork/') then
    raise exception 'Artwork path is invalid' using errcode = '22023';
  end if;

  select customer_order.design_id
  into v_design_id
  from public.orders as customer_order
  where customer_order.id = p_order_id
    and customer_order.user_id = auth.uid()
    and customer_order.payment_status = 'pending'
    and customer_order.status = 'quote'
  for update;

  if not found then
    raise exception 'Unpaid quote not found for this account' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'artwork' and name = p_file_path
  ) then
    raise exception 'Uploaded artwork file was not found' using errcode = 'P0002';
  end if;

  delete from public.order_files
  where order_id = p_order_id and type = 'artwork';

  insert into public.order_files (order_id, type, file_url)
  values (p_order_id, 'artwork', p_file_path);

  update public.designs
  set artwork_url = p_file_path, updated_at = now()
  where id = v_design_id and user_id = auth.uid();
end;
$$;

revoke all on function public.attach_customer_artwork(uuid, text) from public;
grant execute on function public.attach_customer_artwork(uuid, text) to authenticated;

create or replace function public.create_order_proof(
  p_order_id uuid,
  p_file_path text
)
returns table (created_proof_id uuid, created_proof_version integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_next_version integer;
  v_proof_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  v_prefix := 'orders/' || p_order_id::text || '/proofs/';
  if p_file_path is null or left(p_file_path, length(v_prefix)) <> v_prefix then
    raise exception 'Proof file path is invalid' using errcode = '22023';
  end if;

  perform 1
  from public.orders
  where id = p_order_id and status not in ('production', 'completed')
  for update;

  if not found then
    raise exception 'Order not found or already in production' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'artwork' and name = p_file_path
  ) then
    raise exception 'Uploaded proof file was not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.proofs
  where order_id = p_order_id;

  insert into public.proofs (order_id, version, file_url, status)
  values (p_order_id, v_next_version, p_file_path, 'pending')
  returning id into v_proof_id;

  insert into public.order_files (order_id, type, file_url)
  values (p_order_id, 'proof', p_file_path);

  update public.orders
  set status = 'proof', updated_at = now()
  where id = p_order_id;

  return query select v_proof_id, v_next_version;
end;
$$;

revoke all on function public.create_order_proof(uuid, text) from public;
grant execute on function public.create_order_proof(uuid, text) to authenticated;
