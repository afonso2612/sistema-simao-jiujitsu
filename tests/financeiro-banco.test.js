import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {mensalidadesEmAberto, valorComJuros} from '../src/services/financeiro.js';
const db=new PGlite();
const diretor='11111111-1111-4111-8111-111111111111';
const professor='22222222-2222-4222-8222-222222222222';
const outroDiretor='33333333-3333-4333-8333-333333333333';
const academia='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let referencia, inicio;
before(async()=>{
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles (id uuid primary key, cargo text, academia_id uuid, aluno_id uuid);
 create table public.alunos (id uuid primary key, nome text, academia_id uuid, vencimento smallint, mensalidade numeric(10,2), status_pagamento text, ultimo_pagamento date, auth_user_id uuid);
 create table public.pagamentos (id uuid primary key default gen_random_uuid(), aluno_id uuid references public.alunos(id), valor numeric(10,2), status text, data_pagamento date, criado_em timestamptz default now(), confirmado_por uuid, comprovante_url text);
 grant usage on schema public, auth to authenticated, anon;
 grant select,insert,update on public.alunos, public.pagamentos, public.profiles to authenticated;
 insert into public.profiles(id,cargo,academia_id) values ('${diretor}','diretor','${academia}'),('${professor}','professor','${academia}'),('${outroDiretor}','diretor','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 `);
 const sql=fs.readFileSync(new URL('../supabase/migrations/202610090001_financeiro_competencias.sql',import.meta.url),'utf8');
 await db.exec(sql); await db.exec(sql); // DDL pode ser reaplicado sem destruir dados.
 referencia=(await db.query("select current_date::text as hoje")).rows[0].hoje;
 inicio=(await db.query("select (date_trunc('month',current_date) - interval '1 month')::date::text as inicio")).rows[0].inicio;
});
after(async()=>{await db.close()});
async function usuario(id){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||''])}
async function novo({base=100,inicioFinanceiro=inicio}={}){
 const id=crypto.randomUUID();
 await db.query("insert into public.alunos(id,nome,academia_id,vencimento,mensalidade,status_pagamento,inicio_financeiro) values ($1,'Teste',$2,5,$3,'Pendente',$4)",[id,academia,base,inicioFinanceiro]);
 return id;
}
function calculo(pagamentosFinanceiros=[]){const a={mensalidade:100,vencimento:5,inicioFinanceiro:inicio,pagamentosFinanceiros};const data=new Date(referencia+'T12:00:00');return {meses:mensalidadesEmAberto(a,data).map(l=>l.competencia),valor:valorComJuros(a,data),linhas:mensalidadesEmAberto(a,data)}}
async function confirmar(id,c=calculo(),pagamentoId=null){return (await db.query("select public.confirmar_mensalidades_acumuladas($1,$2,$3,$4,$5,null) as resultado",[id,c.meses,c.valor,referencia,pagamentoId])).rows[0].resultado}
async function quantidade(id){return Number((await db.query('select count(*) as n from public.pagamentos where aluno_id=$1',[id])).rows[0].n)}
test('SQL confirma todos os meses e calcula os mesmos valores do JS',async()=>{
 const id=await novo();await usuario(diretor);const c=calculo();const p=await confirmar(id,c);
 assert.deepEqual(p.competencias_quitadas,c.meses);assert.equal(Number(p.valor),c.valor);
 assert.deepEqual(p.detalhamento_mensalidades,c.linhas);
 const a=(await db.query('select status_pagamento,ultimo_pagamento::text from public.alunos where id=$1',[id])).rows[0];
 assert.equal(a.status_pagamento,'Pago');assert.equal(a.ultimo_pagamento,referencia);
 await assert.rejects(confirmar(id,c),/Nenhuma mensalidade/);assert.equal(await quantidade(id),1);
});
test('SQL rejeita total desatualizado e não grava pagamento ou status',async()=>{
 const id=await novo();await usuario(diretor);await assert.rejects(confirmar(id,{...calculo(),valor:1}),/saldo mudou/);
 assert.equal(await quantidade(id),0);assert.equal((await db.query('select status_pagamento from public.alunos where id=$1',[id])).rows[0].status_pagamento,'Pendente');
});
test('SQL rejeita mês ausente/duplicado e data retroativa sem gravação',async()=>{
 const id=await novo();await usuario(diretor);const c=calculo();
 await assert.rejects(confirmar(id,{...c,meses:c.meses.slice(1)}),/saldo mudou/);
 await assert.rejects(confirmar(id,{...c,meses:[...c.meses,c.meses[0]]}),/saldo mudou/);
 await assert.rejects(db.query('select public.confirmar_mensalidades_acumuladas($1,$2,$3,$4,null,null)',[id,c.meses,c.valor,'2020-01-01']),/Data de pagamento/);
 assert.equal(await quantidade(id),0);
});
test('SQL bloqueia professor, diretor de outra academia e sessão ausente',async()=>{
 const id=await novo();for(const uid of [professor,outroDiretor,'']){await usuario(uid);await assert.rejects(confirmar(id),/diretor|Sessão/)}
 assert.equal(await quantidade(id),0);
});
test('SQL preserva legado e não quita mês novo pelo dia do recebimento',async()=>{
 const id=await novo();await usuario(diretor);
 await db.query("insert into public.pagamentos(aluno_id,valor,status,data_pagamento) values ($1,100,'Pago',$2)",[id,inicio]);
 const c=calculo([{status:'Pago',data_pagamento:inicio}]);const p=await confirmar(id,c);assert.equal(p.competencias_quitadas.length,1);assert.equal(await quantidade(id),2);
});
test('SQL confirma comprovante em lugar de criar duplicata',async()=>{
 const id=await novo();await usuario(diretor);
 const pid=(await db.query("insert into public.pagamentos(aluno_id,valor,status,data_pagamento,comprovante_url) values($1,100,'Aguardando',$2,'arquivo.pdf') returning id",[id,referencia])).rows[0].id;
 const p=await confirmar(id,calculo(),pid);assert.equal(p.id,pid);assert.equal(p.comprovante_url,'arquivo.pdf');assert.equal(await quantidade(id),1);
});
test('SQL não usa comprovante de outro aluno e mantém operação atômica',async()=>{
 const id=await novo();const outro=await novo();await usuario(diretor);
 const pid=(await db.query("insert into public.pagamentos(aluno_id,status) values($1,'Aguardando') returning id",[outro])).rows[0].id;
 await assert.rejects(confirmar(id,calculo(),pid),/Comprovante/);assert.equal(await quantidade(id),0);
});
test('SQL cancelamento reabre todos os meses e pode ser quitado novamente',async()=>{
 const id=await novo();await usuario(diretor);const p=await confirmar(id);
 await usuario(professor);await assert.rejects(db.query('select public.cancelar_mensalidades_acumuladas($1)',[p.id]),/diretor/);
 await usuario(diretor);const cancelado=(await db.query('select public.cancelar_mensalidades_acumuladas($1) as r',[p.id])).rows[0].r;
 assert.equal(cancelado.status,'Pendente');assert.equal(cancelado.data_pagamento,null);
 await assert.rejects(db.query('select public.cancelar_mensalidades_acumuladas($1)',[p.id]),/disponível/);
 const novamente=await confirmar(id);assert.notEqual(novamente.id,p.id);
});
test('SQL não cria cobrança histórica sem início revisado',async()=>{
 const id=await novo({inicioFinanceiro:null});await usuario(diretor);await assert.rejects(confirmar(id),/primeiro mês/);assert.equal(await quantidade(id),0);
});
test('gatilhos bloqueiam aluno/professor de alterar início ou competências',async()=>{
 const id=await novo();await usuario(professor);await db.exec('set role authenticated');
 try{
  await assert.rejects(db.query("update public.alunos set inicio_financeiro='2020-01-01' where id=$1",[id]),/diretor/);
  await assert.rejects(db.query("insert into public.pagamentos(aluno_id,status,competencias_quitadas) values ($1,'Aguardando',array['2026-10'])",[id]),/diretor/);
 }finally{await db.exec('reset role')}
});
test('diretor autenticado pode ativar cobrança e anon não executa RPC',async()=>{
 const id=await novo({inicioFinanceiro:null});await usuario(diretor);await db.exec('set role authenticated');
 try{await db.query('update public.alunos set inicio_financeiro=$1 where id=$2',[inicio,id]);await confirmar(id)}finally{await db.exec('reset role')}
 await db.exec('set role anon');try{await assert.rejects(confirmar(id),/permission denied/)}finally{await db.exec('reset role')}
});

test('aluno não insere Pago/Pendente nem se autoquita, mas envia comprovante e edita nome',async()=>{
 const id=await novo();const alunoUid='44444444-4444-4444-8444-444444444444';
 await db.query("insert into public.profiles(id,cargo,academia_id,aluno_id) values($1,'aluno',$2,$3)",[alunoUid,academia,id]);
 await db.query('update public.alunos set auth_user_id=$1 where id=$2',[alunoUid,id]);
 await usuario(alunoUid);await db.exec('set role authenticated');
 try {
  for(const status of ['Pago','Pendente','Rejeitado']) await assert.rejects(db.query('insert into public.pagamentos(aluno_id,valor,status) values($1,100,$2)',[id,status]),/diretor/);
  await assert.rejects(db.query("insert into public.pagamentos(aluno_id,valor,status,confirmado_por) values($1,100,'Aguardando',$2)",[id,alunoUid]),/diretor/);
  const pid=(await db.query("insert into public.pagamentos(aluno_id,valor,status,comprovante_url) values($1,100,'Aguardando','prova.pdf') returning id",[id])).rows[0].id;
  await assert.rejects(db.query("update public.pagamentos set status='Pago' where id=$1",[pid]),/diretor/);
  for(const coluna of ["status_pagamento='Pago'","ultimo_pagamento=current_date","mensalidade=0","vencimento=31","inicio_financeiro='2020-01-01'","auth_user_id=null","academia_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'"]) {
   await assert.rejects(db.query('update public.alunos set '+coluna+' where id=$1',[id]),/diretor/);
  }
  await db.query("update public.alunos set nome='Nome atualizado' where id=$1",[id]);
 }finally{await db.exec('reset role')}
 assert.equal((await db.query('select nome,status_pagamento,mensalidade from public.alunos where id=$1',[id])).rows[0].nome,'Nome atualizado');
});
test('diretor pode confirmar fluxo mensal legado após a proteção nova',async()=>{
 const id=await novo();await usuario(diretor);await db.exec('set role authenticated');
 try{
  const pid=(await db.query("insert into public.pagamentos(aluno_id,valor,status) values($1,100,'Aguardando') returning id",[id])).rows[0].id;
  await db.query("update public.pagamentos set status='Pago',data_pagamento=current_date where id=$1",[pid]);
  await db.query("update public.alunos set status_pagamento='Pago',ultimo_pagamento=current_date where id=$1",[id]);
 }finally{await db.exec('reset role')}
});
