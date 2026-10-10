-- Cinco dias corridos de tolerancia para multa e juros. Preserva pagamentos existentes.
begin;
create or replace function public.confirmar_mensalidades_acumuladas(
  p_aluno_id uuid,
  p_competencias text[],
  p_valor_esperado numeric,
  p_data_pagamento date,
  p_pagamento_id uuid default null,
  p_comprovante text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_aluno public.alunos%rowtype;
  v_pagamento public.pagamentos%rowtype;
  v_mes date; v_vencimento date; v_dias integer; v_juros integer;
  v_competencia text; v_multa numeric; v_valor numeric;
  v_total numeric := 0; v_linhas jsonb := '[]'::jsonb;
  v_competencias text[] := array[]::text[];
  v_informadas text[];
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then raise exception 'Sessão autenticada necessária.'; end if;
  -- Serializa confirmações do mesmo aluno, inclusive em duas abas.
  select * into v_aluno from public.alunos where id = p_aluno_id for update;
  if not found then raise exception 'Aluno não encontrado.'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_usuario and p.cargo = 'diretor'
    and p.academia_id = v_aluno.academia_id) then
    raise exception 'Apenas diretor da academia pode confirmar mensalidades.';
  end if;
  if v_aluno.inicio_financeiro is null then raise exception 'Revise o primeiro mês de cobrança do aluno.'; end if;
  if v_aluno.vencimento is null or v_aluno.vencimento < 1 or v_aluno.vencimento > 31 then
    raise exception 'Dia de vencimento inválido.';
  end if;
  if v_aluno.mensalidade is null or v_aluno.mensalidade < 0 or v_aluno.mensalidade::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Mensalidade inválida.';
  end if;
  -- A data civil do navegador pode diferir um dia de UTC. Não aceita retrodatação livre.
  if p_data_pagamento is null or abs(p_data_pagamento - current_date) > 1 then
    raise exception 'Data de pagamento inválida. Atualize a tela.';
  end if;
  v_mes := v_aluno.inicio_financeiro;
  while v_mes <= date_trunc('month', p_data_pagamento)::date loop
    v_competencia := to_char(v_mes, 'YYYY-MM');
    if not exists (
      select 1 from public.pagamentos p where p.aluno_id = p_aluno_id and p.status = 'Pago'
      and case when p.competencias_quitadas is not null then v_competencia = any(p.competencias_quitadas)
        else v_competencia = to_char(coalesce(p.data_pagamento,
          (p.criado_em at time zone 'America/Manaus')::date), 'YYYY-MM') end
    ) then
      v_vencimento := v_mes + (least(v_aluno.vencimento::integer,
        extract(day from (v_mes + interval '1 month - 1 day'))::integer) - 1);
      v_dias := greatest(0, p_data_pagamento - v_vencimento);
      v_juros := greatest(0, v_dias - 5);
      v_multa := case when v_juros > 0 then 10 else 0 end;
      v_valor := round(v_aluno.mensalidade, 2) + v_multa + v_juros;
      v_total := v_total + v_valor;
      v_competencias := array_append(v_competencias, v_competencia);
      v_linhas := v_linhas || jsonb_build_array(jsonb_build_object(
        'competencia', v_competencia, 'vencimento', v_vencimento,
        'mensalidade', round(v_aluno.mensalidade, 2), 'dias_atraso', v_dias,
        'multa', v_multa, 'juros', v_juros, 'total', v_valor));
    end if;
    v_mes := (v_mes + interval '1 month')::date;
  end loop;
  select array_agg(c order by c) into v_informadas from unnest(p_competencias) c;
  if cardinality(v_competencias) = 0 then raise exception 'Nenhuma mensalidade em aberto.'; end if;
  if v_informadas is distinct from v_competencias or p_valor_esperado is null
     or p_valor_esperado <> v_total then
    raise exception 'O saldo mudou. Recarregue e confira os meses e o valor antes de confirmar.';
  end if;
  if p_pagamento_id is not null then
    select * into v_pagamento from public.pagamentos where id = p_pagamento_id for update;
    if not found or v_pagamento.aluno_id <> p_aluno_id or v_pagamento.status <> 'Aguardando' then
      raise exception 'Comprovante não está disponível para confirmação.';
    end if;
    update public.pagamentos set valor = v_total, status = 'Pago', data_pagamento = p_data_pagamento,
      competencias_quitadas = v_competencias, detalhamento_mensalidades = v_linhas,
      confirmado_por = v_usuario,
      comprovante_url = coalesce(p_comprovante, comprovante_url)
    where id = p_pagamento_id returning * into v_pagamento;
  else
    insert into public.pagamentos (aluno_id, valor, status, data_pagamento, competencias_quitadas,
      detalhamento_mensalidades, confirmado_por, comprovante_url)
    values (p_aluno_id, v_total, 'Pago', p_data_pagamento, v_competencias, v_linhas, v_usuario, p_comprovante)
    returning * into v_pagamento;
  end if;
  update public.alunos set status_pagamento = 'Pago', ultimo_pagamento = p_data_pagamento where id = p_aluno_id;
  return to_jsonb(v_pagamento);
end $$;
commit;
