import test from 'node:test';
import assert from 'node:assert/strict';
import {statusFinanceiro, valorComJuros, diasAtraso, pagamentoPertenceAoMes, dataLocalISO, dataDoPagamento, mensalidadesEmAberto} from '../src/services/financeiro.js';
const aluno = {mensalidade: 100, vencimento: 5, statusPagamento: 'Pendente'};
const data = (ano, mes, dia) => new Date(ano, mes - 1, dia, 12);
test('vencimento e cinco dias seguintes sem encargos; sexto dia cobra 10 + 1', () => {
 assert.equal(valorComJuros(aluno, data(2026,10,5)),100);
 assert.equal(statusFinanceiro(aluno,data(2026,10,5)),'Pendente');
 assert.equal(valorComJuros(aluno,data(2026,10,6)),100);
 assert.equal(valorComJuros(aluno,data(2026,10,7)),100);
 assert.equal(valorComJuros(aluno,data(2026,10,10)),100);
 assert.equal(valorComJuros(aluno,data(2026,10,11)),111);
 assert.equal(valorComJuros(aluno,data(2026,10,12)),112);
});
test('mensalidade textual nao concatena numeros',()=> assert.equal(valorComJuros({...aluno,mensalidade:'100'},data(2026,10,7)),100));
test('pagamento antigo nao quita o mes; pagamento atual quita',()=>{
 assert.equal(statusFinanceiro({...aluno,statusPagamento:'Pago',ultimoPagamento:'05/09/2026'},data(2026,10,7)),'Vencido');
 assert.equal(valorComJuros({...aluno,statusPagamento:'Pago',ultimoPagamento:'05/10/2026'},data(2026,10,7)),100);
 assert.equal(statusFinanceiro({...aluno,statusPagamento:'Pago',ultimoPagamento:'2026-10-05'},data(2026,10,7)),'Pago');
 assert.equal(statusFinanceiro({...aluno,statusPagamento:'Pago',ultimoPagamento:'05/10/2026'},data(2026,11,7)),'Vencido');
});
test('vencimento 31 ajusta fevereiro comum e bissexto',()=>{
 assert.equal(statusFinanceiro({...aluno,vencimento:31},data(2026,2,28)),'Pendente');
 assert.equal(statusFinanceiro({...aluno,vencimento:31},data(2028,2,29)),'Pendente');
});
test('vencimento ausente ou invalido nao inventa juros',()=>{
 for(const vencimento of [0,null,undefined,-1,32,2.5,'x']) assert.equal(valorComJuros({...aluno,vencimento},data(2026,10,7)),100);
});
test('aguardando e rejeitado nao quitam mensalidade',()=>{
 for(const statusPagamento of ['Aguardando','Rejeitado']) assert.equal(valorComJuros({...aluno,statusPagamento},data(2026,10,7)),100);
});
test('mes considera ano e valida data; criado_em vale quando sem data pagamento',()=>{
 assert.equal(pagamentoPertenceAoMes({data_pagamento:'2025-10-05'},data(2026,10,7)),false);
 assert.equal(pagamentoPertenceAoMes({data_pagamento:'2026-02-31'},data(2026,3,7)),false);
 assert.equal(pagamentoPertenceAoMes({criado_em:'2026-10-07T12:00:00Z'},data(2026,10,7)),true);
 assert.equal(dataLocalISO(data(2026,10,7)),'2026-10-07');
});
test('dias de atraso independem de mudanca de horario de verao',()=> assert.equal(diasAtraso({...aluno,vencimento:7},data(2026,3,10)),3));

test('timestamp usa dia local e datas invalidas nao quitam',()=>{
 const valor='2026-11-01T01:30:00Z';
 assert.equal(dataLocalISO(dataDoPagamento({criado_em:valor})),'2026-10-31');
 for(const criado_em of ['invalido','2026-99-99T00:00:00Z']) {
  assert.equal(dataDoPagamento({criado_em}),null);
  assert.equal(pagamentoPertenceAoMes({criado_em},data(2026,10,7)),false);
 }
});

 test('tolerancia individual em todos os vencimentos e viradas do calendario',()=>{
  for (const [ano,mes] of [[2026,10],[2026,12],[2026,2],[2028,2]]) {
   for(let vencimento=1;vencimento<=31;vencimento++) {
    const ultimo=new Date(ano,mes,0).getDate();
    const dia=Math.min(vencimento,ultimo);
    const a={mensalidade:85,vencimento,inicioFinanceiro:`${ano}-${String(mes).padStart(2,'0')}-01`,pagamentosFinanceiros:[]};
    for(const offset of [0,1,5,6,7]) {
     const ref=new Date(ano,mes-1,dia+offset,12);
     const linha=mensalidadesEmAberto(a,ref)[0];
     assert.equal(linha.juros,Math.max(0,offset-5));
     assert.equal(linha.multa,offset>5?10:0);
     assert.equal(linha.total,85+(offset>5?10:0)+Math.max(0,offset-5));
    }
   }
  }
 });
