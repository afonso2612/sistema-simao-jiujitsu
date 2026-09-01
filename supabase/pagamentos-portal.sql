grant select, insert, update on public.pagamentos to authenticated;

drop policy if exists "Site publicado consulta pagamentos" on public.pagamentos;
drop policy if exists "Site publicado envia pagamentos" on public.pagamentos;
drop policy if exists "Site publicado atualiza pagamentos" on public.pagamentos;
