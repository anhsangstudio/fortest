create table if not exists public.trello_sync_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null default 'print_order',
  entity_id uuid not null,
  trello_card_id text not null,
  old_status_id uuid null,
  new_status_id uuid not null,
  sync_action text not null default 'update_label',
  sync_status text not null default 'pending',
  retry_count integer not null default 0,
  last_error text null,
  payload_json jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_trello_sync_queue_status
    check (sync_status in ('pending', 'processing', 'success', 'error'))
);

create unique index if not exists uq_trello_sync_queue_pending_unique
on public.trello_sync_queue(entity_type, entity_id, new_status_id, sync_action)
where sync_status = 'pending';

create index if not exists idx_trello_sync_queue_status_created
on public.trello_sync_queue(sync_status, created_at);

create index if not exists idx_trello_sync_queue_entity
on public.trello_sync_queue(entity_type, entity_id);


create or replace function public.enqueue_print_order_trello_label_sync()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'update' then
    return new;
  end if;

  if new.status_id is not distinct from old.status_id then
    return new;
  end if;

  if new.trello_card_id is null or btrim(new.trello_card_id) = '' then
    return new;
  end if;

  if new.status_id not in (
    '0a3b2bbe-10d7-41ca-8095-f2c105aae949', -- ĐÃ ĐỦ ẢNH
    '175fff24-f812-4700-997c-e37cc26012ef', -- TRẢ THIẾU ẢNH
    'a98120be-e94d-489b-bb21-48c32a9e8d9a'  -- ĐÃ GIAO KHÁCH
  ) then
    return new;
  end if;

  insert into public.trello_sync_queue (
    entity_type,
    entity_id,
    trello_card_id,
    old_status_id,
    new_status_id,
    sync_action,
    sync_status,
    payload_json
  )
  values (
    'print_order',
    new.id,
    new.trello_card_id,
    old.status_id,
    new.status_id,
    'update_label',
    'pending',
    jsonb_build_object(
      'print_order_id', new.id,
      'trello_card_id', new.trello_card_id,
      'old_status_id', old.status_id,
      'new_status_id', new.status_id
    )
  )
  on conflict do nothing;

  return new;
end;
$$;



drop trigger if exists trg_enqueue_print_order_trello_label_sync on public.print_orders;

create trigger trg_enqueue_print_order_trello_label_sync
after update of status_id on public.print_orders
for each row
execute function public.enqueue_print_order_trello_label_sync();
