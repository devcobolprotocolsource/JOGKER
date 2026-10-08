begin;

alter table public.payment_accounts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists payment_accounts_set_updated_at on public.payment_accounts;
create trigger payment_accounts_set_updated_at
before update on public.payment_accounts
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end
$$;

commit;
