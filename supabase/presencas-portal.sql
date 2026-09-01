grant select, insert, update, delete on public.presencas to authenticated;

drop policy if exists "Site publicado consulta presencas" on public.presencas;
drop policy if exists "Site publicado registra presencas" on public.presencas;
drop policy if exists "Site publicado atualiza presencas" on public.presencas;
drop policy if exists "Site publicado remove presencas" on public.presencas;
