import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {pagamentoPertenceAoMes, dataDoPagamento, dataLocalISO, cobrancaAcumuladaAtiva, mensalidadesEmAberto, valorComJuros, statusFinanceiro} from '../src/services/financeiro.js';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const ast=require('@babel/parser').parse(source,{sourceType:'module',plugins:['jsx']});
function trecho(nome){let resultado;function visitar(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id?.name===nome)resultado=source.slice(n.start,n.end);for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(visitar);else if(v&&typeof v==='object')visitar(v)}}visitar(ast);assert.ok(resultado,nome);return resultado}
const funcoes=['dataISOParaBrasil','dataPagamentoParaBrasil','dataPagamentoParaTempo','obterUltimoPagamentoDoAluno','aplicarPagamentosNosAlunos'].map(trecho).join('\n');
const contexto={pagamentoPertenceAoMes, dataDoPagamento, dataLocalISO, cobrancaAcumuladaAtiva, mensalidadesEmAberto, valorComJuros, statusFinanceiro};vm.createContext(contexto);vm.runInContext(funcoes,contexto);
const agora=new Date();const iso=(mes)=>new Date(agora.getFullYear(),agora.getMonth()+mes,5,12).toISOString().slice(0,10);
test('projecao financeira ignora pago antigo, conserva historico e remove comprovante antigo',()=>{
 const resultado=contexto.aplicarPagamentosNosAlunos([{id:'1',statusPagamento:'Pago',comprovantePagamento:'antigo'}],[{aluno_id:'1',status:'Pago',valor:100,data_pagamento:iso(-1)}])[0];
 assert.equal(resultado.statusPagamento,'Pendente');assert.equal(resultado.historicoPagamentos.length,1);assert.equal(resultado.comprovantePagamento,'');
});
test('projecao financeiro e consulta scanner consideram mes atual',()=>{
 const r=contexto.aplicarPagamentosNosAlunos([{id:'1'}],[{aluno_id:'1',status:'Pago',valor:100,data_pagamento:iso(0)}])[0];assert.equal(r.statusPagamento,'Pago');assert.ok(r.ultimoPagamento);
 assert.equal(contexto.obterUltimoPagamentoDoAluno([{aluno_id:'1',status:'Pago',data_pagamento:iso(-1)}],'1'),undefined);
});
async function login({perfil={id:'auth',cargo:'aluno',academia_id:'academia',aluno_id:'aluno'},erro}={}) {
 const chamadas={alertas:[],senha:null,tela:null,saiu:false};
 const noop=()=>{};
 const ctx={usuario:' aluno@example.com ',senha:' senha com espaco ',loginEmAndamento:false,usuarios:[],supabaseConfigurado:true,
  setLoginEmAndamento:noop,setSessaoSupabasePronta:noop,setUsuarios:noop,setUsuarioLogado:noop,setTipoUsuario:noop,
  setTela:v=>chamadas.tela=v,alert:v=>chamadas.alertas.push(v),console:{error:noop},
  limitarTempo:p=>p,entrarComEmailSenha:async(email,senha)=>{chamadas.senha=senha;assert.equal(email,'aluno@example.com');if(erro)throw Error(erro);return{user:{id:'auth'}}},
  obterPerfilSupabase:async()=>perfil,sairDoSupabase:async()=>{chamadas.saiu=true}
 };
 vm.createContext(ctx);vm.runInContext(trecho('perfilOnlineValido') + '\n' + trecho('fazerLogin'),ctx);await ctx.fazerLogin();return chamadas;
}
test('login aluno mantem senha literal e abre portal',async()=>{const r=await login();assert.equal(r.senha,' senha com espaco ');assert.equal(r.tela,'portalAluno');assert.equal(r.alertas.length,0)});
test('perfil ausente encerra sessao autenticada',async()=>{const r=await login({perfil:null});assert.equal(r.saiu,true);assert.equal(r.tela,null);assert.equal(r.alertas.length,1)});
test('credenciais invalidas nao liberam portal',async()=>{const r=await login({erro:'Invalid login credentials'});assert.equal(r.tela,null);assert.equal(r.saiu,true)});

test('pagamento sem data_pagamento usa criado_em no status e no historico',()=>{
 const r=contexto.aplicarPagamentosNosAlunos([{id:'1'}],[{aluno_id:'1',status:'Pago',valor:100,criado_em:iso(0)+'T12:00:00Z'}])[0];
 assert.equal(r.statusPagamento,'Pago');
 assert.ok(r.ultimoPagamento);
 assert.equal(r.historicoPagamentos[0].data,r.ultimoPagamento);
});
for (const perfil of [
 {id:'auth',cargo:'aluno',academia_id:'academia',aluno_id:null},
 {id:'auth',cargo:'desconhecido',academia_id:'academia'},
 {id:'auth',cargo:'diretor',academia_id:null}
]) test('perfil incompleto ou cargo desconhecido nao abre painel: '+JSON.stringify(perfil),async()=>{
 const r=await login({perfil});assert.equal(r.saiu,true);assert.equal(r.tela,null);assert.equal(r.alertas.length,1);
});
for (const [cargo,tela] of [['diretor','dashboard'],['professor','portalProfessor']])
 test('login autorizado '+cargo,async()=>{const r=await login({perfil:{id:'auth',cargo,academia_id:'academia'}});assert.equal(r.tela,tela);assert.equal(r.alertas.length,0)});

test('projeção mantém competências e não libera aluno com mês antigo aberto',()=>{
 const a={id:'1',mensalidade:100,vencimento:5,inicioFinanceiro:'2026-09-01'};
 const p={aluno_id:'1',status:'Pago',valor:100,data_pagamento:'2026-10-08',competencias_quitadas:['2026-10']};
 const r=contexto.aplicarPagamentosNosAlunos([a],[p])[0];
 assert.deepEqual(JSON.parse(JSON.stringify(r.historicoPagamentos[0].competencias_quitadas)),['2026-10']);
 assert.equal(statusFinanceiro(r,new Date(2026,9,8)),'Vencido');
 assert.equal(valorComJuros(r,new Date(2026,9,8)),138);
});
async function confirmarAcumulado({aceitar=true,falhar=false}={}) {
 const a={id:'1',nome:'Aluno',mensalidade:100,vencimento:5,inicioFinanceiro:'2026-09-01',pagamentosFinanceiros:[]};
 const pendente={id:'comprovante',aluno_id:'1',status:'Aguardando',data_pagamento:'2026-09-08',comprovante_path:'arquivo.pdf'};
 const r={chamadas:[],alertas:[],alunos:[a],pergunta:''};
 const ctx={alunos:[a],pagamentosRef:{current:[pendente]},supabaseConfigurado:true,diretorOnlineLogado:true,
  confirmacoesFinanceiras:{current:new Set()},cobrancaAcumuladaAtiva,mensalidadesEmAberto,valorComJuros,pagamentoPertenceAoMes,dataDoPagamento,dataLocalISO,
  dataAtualFinanceira:()=>new Date(2026,9,8),
  confirm:v=>{r.pergunta=v;return aceitar},alert:v=>r.alertas.push(v),formatarMoeda:v=>String(v),adicionarAviso:()=>{},
  setPagamentos:v=>r.pagamentos=v,setAlunos:fn=>r.alunos=fn(r.alunos),
  confirmarPagamentoOnline:async p=>{r.chamadas.push(p);if(falhar)throw Error('saldo mudou');return [{...p,id:'comprovante'}]},
 };
 vm.createContext(ctx);
 vm.runInContext(['dataISOParaBrasil','dataPagamentoParaBrasil','dataPagamentoParaTempo','obterUltimoPagamentoDoAluno','aplicarPagamentosNosAlunos','marcarComoPago'].map(trecho).join('\n'),ctx);
 await ctx.marcarComoPago('1');return r;
}
test('confirmação acumulada quita todos os meses pela RPC e reaproveita comprovante antigo',async()=>{
 const r=await confirmarAcumulado();assert.equal(r.chamadas.length,1);assert.equal(r.chamadas[0].valor,238);
 assert.deepEqual(JSON.parse(JSON.stringify(r.chamadas[0].competencias_quitadas)),['2026-09','2026-10']);
 assert.equal(r.chamadas[0].id,'comprovante');assert.equal(r.chamadas[0].comprovante_path,'arquivo.pdf');
 assert.equal(statusFinanceiro(r.alunos[0],new Date(2026,9,8)),'Pago');
});
test('cancelar confirmação no diálogo não grava nada',async()=>{const r=await confirmarAcumulado({aceitar:false});assert.equal(r.chamadas.length,0);assert.equal(r.alunos[0].pagamentosFinanceiros.length,0)});
test('falha na RPC não altera saldo local nem informa sucesso',async()=>{const r=await confirmarAcumulado({falhar:true});assert.equal(r.alunos[0].pagamentosFinanceiros.length,0);assert.match(r.alertas[0],/Não foi possível/)});
