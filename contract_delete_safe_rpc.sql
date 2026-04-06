-- =========================================================
-- SAFE DELETE RPCs FOR CONTRACT MANAGER
-- Mục tiêu:
-- 1) Xóa cứng hợp đồng theo đúng thứ tự dependency
-- 2) Xóa cứng các dịch vụ bị bỏ khỏi hợp đồng mà không vướng FK
-- =========================================================

begin;

-- ---------------------------------------------------------
-- RPC 1: Xóa các contract_items bị bỏ khỏi hợp đồng
-- ---------------------------------------------------------
drop function if exists public.contract_delete_removed_items_safe(text, text[]);
create or replace function public.contract_delete_removed_items_safe(
  p_contract_id text,
  p_item_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_ids text[] := coalesce(p_item_ids, '{}'::text[]);
  v_deleted_trap_orders integer := 0;
  v_deleted_tasks integer := 0;
  v_deleted_items integer := 0;
begin
  if p_contract_id is null or btrim(p_contract_id) = '' then
    raise exception 'Thiếu p_contract_id';
  end if;

  if array_length(v_item_ids, 1) is null then
    return jsonb_build_object(
      'success', true,
      'contract_id', p_contract_id,
      'deleted_trap_delivery_orders', 0,
      'deleted_tasks', 0,
      'deleted_contract_items', 0
    );
  end if;

  v_item_ids := array(
    select ci.id
    from public.contract_items ci
    where ci.contract_id = p_contract_id
      and ci.id = any(v_item_ids)
  );

  if array_length(v_item_ids, 1) is null then
    return jsonb_build_object(
      'success', true,
      'contract_id', p_contract_id,
      'deleted_trap_delivery_orders', 0,
      'deleted_tasks', 0,
      'deleted_contract_items', 0
    );
  end if;

  delete from public.trap_delivery_orders
  where contract_id = p_contract_id
    and contract_item_id = any(v_item_ids);
  get diagnostics v_deleted_trap_orders = row_count;

  delete from public.tasks
  where contract_id = p_contract_id
    and contract_item_id = any(v_item_ids);
  get diagnostics v_deleted_tasks = row_count;

  delete from public.contract_items
  where contract_id = p_contract_id
    and id = any(v_item_ids);
  get diagnostics v_deleted_items = row_count;

  return jsonb_build_object(
    'success', true,
    'contract_id', p_contract_id,
    'deleted_item_ids', v_item_ids,
    'deleted_trap_delivery_orders', v_deleted_trap_orders,
    'deleted_tasks', v_deleted_tasks,
    'deleted_contract_items', v_deleted_items
  );
end;
$$;

-- ---------------------------------------------------------
-- RPC 2: Xóa cứng cả hợp đồng theo đúng thứ tự dependency
-- Theo quyết định đã chốt:
-- - trap_delivery_orders: xóa cứng
-- - tasks: xóa cứng
-- - schedules: xóa cứng
-- - transactions: xóa cứng
-- - print_orders: xóa cứng
-- ---------------------------------------------------------
drop function if exists public.contract_delete_safe(text);
create or replace function public.contract_delete_safe(
  p_contract_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_ids text[] := '{}'::text[];
  v_print_order_ids uuid[] := '{}'::uuid[];
  v_deleted_trap_orders integer := 0;
  v_deleted_tasks integer := 0;
  v_deleted_schedules integer := 0;
  v_deleted_transactions integer := 0;
  v_deleted_print_order_items integer := 0;
  v_deleted_print_orders integer := 0;
  v_deleted_contract_items integer := 0;
  v_deleted_contracts integer := 0;
begin
  if p_contract_id is null or btrim(p_contract_id) = '' then
    raise exception 'Thiếu p_contract_id';
  end if;

  if not exists (
    select 1 from public.contracts where id = p_contract_id
  ) then
    raise exception 'Không tìm thấy hợp đồng: %', p_contract_id;
  end if;

  select coalesce(array_agg(id), '{}'::text[])
  into v_item_ids
  from public.contract_items
  where contract_id = p_contract_id;

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_print_order_ids
  from public.print_orders
  where contract_id = p_contract_id;

  delete from public.trap_delivery_orders
  where contract_id = p_contract_id;
  get diagnostics v_deleted_trap_orders = row_count;

  delete from public.tasks
  where contract_id = p_contract_id
     or (
       array_length(v_item_ids, 1) is not null
       and contract_item_id = any(v_item_ids)
     );
  get diagnostics v_deleted_tasks = row_count;

  delete from public.schedules
  where contract_id = p_contract_id;
  get diagnostics v_deleted_schedules = row_count;

  delete from public.transactions
  where contract_id = p_contract_id;
  get diagnostics v_deleted_transactions = row_count;

  if array_length(v_print_order_ids, 1) is not null then
    delete from public.print_order_items
    where print_order_id = any(v_print_order_ids);
    get diagnostics v_deleted_print_order_items = row_count;
  end if;

  delete from public.print_orders
  where contract_id = p_contract_id;
  get diagnostics v_deleted_print_orders = row_count;

  if array_length(v_item_ids, 1) is not null then
    delete from public.contract_items
    where id = any(v_item_ids);
    get diagnostics v_deleted_contract_items = row_count;
  end if;

  delete from public.contracts
  where id = p_contract_id;
  get diagnostics v_deleted_contracts = row_count;

  return jsonb_build_object(
    'success', true,
    'contract_id', p_contract_id,
    'deleted_trap_delivery_orders', v_deleted_trap_orders,
    'deleted_tasks', v_deleted_tasks,
    'deleted_schedules', v_deleted_schedules,
    'deleted_transactions', v_deleted_transactions,
    'deleted_print_order_items', v_deleted_print_order_items,
    'deleted_print_orders', v_deleted_print_orders,
    'deleted_contract_items', v_deleted_contract_items,
    'deleted_contracts', v_deleted_contracts
  );
end;
$$;

grant execute on function public.contract_delete_removed_items_safe(text, text[]) to anon, authenticated, service_role;
grant execute on function public.contract_delete_safe(text) to anon, authenticated, service_role;

commit;
