alter table public.alunos
  add column if not exists turma text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_turma_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_turma_check
      check (
        turma is null
        or turma in ('Manhã', 'Tarde', 'Noite')
      );
  end if;
end $$;