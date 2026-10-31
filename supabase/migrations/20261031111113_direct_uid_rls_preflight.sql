-- Preflight cleanup for an earlier lookbook policy name.
drop policy if exists lookbook_member_read_private on public.lookbook_items;
