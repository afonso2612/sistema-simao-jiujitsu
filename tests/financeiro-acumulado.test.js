import test from 'node:test';
import assert from 'node:assert/strict';
import {mensalidadesEmAberto, valorComJuros, statusFinanceiro, diasAtraso, competenciasDoPagamento} from '../src/services/financeiro.js';
const data = (ano, mes, dia) => new Date(ano, mes - 1, dia, 12);
const aluno = {mensalidade: 100, vencimento: 5, inicioFinanceiro: '2026-09-01', pagamentosFinanceiros: []};
test('setembro e outubro: multas e juros separados por mês', () => {
 const linhas=mensalidadesEmAberto(aluno,data(2026,10,8));
 assert.deepEqual(linhas.map(l=>[l.competencia,l.dias_atraso,l.multa,l.juros,l.total]),[['2026-09',33,10,28,138],['2026-10',3,0,0,100]]);
 assert.equal(valorComJuros(aluno,data(2026,10,8)),238);
 assert.equal(diasAtraso(aluno,data(2026,10,8)),33);
});
test('mês atual ainda não vencido não apaga dívida anterior',()=>{
 assert.equal(valorComJuros(aluno,data(2026,10,3)),233); // setembro 133 + outubro 100
 assert.equal(statusFinanceiro(aluno,data(2026,10,3)),'Vencido');
});
test('pagamento em outubro de setembro não quita outubro',()=>{
 const a={...aluno,pagamentosFinanceiros:[{status:'Pago',data_pagamento:'2026-10-08',competencias_quitadas:['2026-09']}]};
 assert.deepEqual(mensalidadesEmAberto(a,data(2026,10,8)).map(l=>l.competencia),['2026-10']);
 assert.equal(valorComJuros(a,data(2026,10,8)),100);
});
test('pagamento do mês atual não zera meses anteriores',()=>{
 const a={...aluno,pagamentosFinanceiros:[{status:'Pago',data_pagamento:'2026-10-08',competencias_quitadas:['2026-10']}]};
 assert.equal(statusFinanceiro(a,data(2026,10,8)),'Vencido');assert.equal(valorComJuros(a,data(2026,10,8)),138);
});
test('quitação de várias competências zera o saldo e reabre no próximo mês',()=>{
 const a={...aluno,pagamentosFinanceiros:[{status:'Pago',data_pagamento:'2026-10-08',competencias_quitadas:['2026-09','2026-10']}]};
 assert.equal(statusFinanceiro(a,data(2026,10,8)),'Pago');assert.equal(valorComJuros(a,data(2026,10,8)),0);
 assert.deepEqual(mensalidadesEmAberto(a,data(2026,11,6)).map(l=>l.competencia),['2026-11']);
 assert.equal(valorComJuros(a,data(2026,11,6)),100);
});
test('cancelamento reabre todas as competências',()=>{
 const a={...aluno,pagamentosFinanceiros:[{status:'Pendente',competencias_quitadas:['2026-09','2026-10']}]};
 assert.equal(valorComJuros(a,data(2026,10,8)),238);
});
test('aguardando/rejeitado não quita',()=>{
 for(const status of ['Aguardando','Rejeitado']) assert.equal(valorComJuros({...aluno,pagamentosFinanceiros:[{status,competencias_quitadas:['2026-09','2026-10']}]},data(2026,10,8)),238);
});
test('dados pagos legados preservam somente o mês da data, não todo o passado',()=>{
 const a={...aluno,pagamentosFinanceiros:[{status:'Pago',data_pagamento:'2026-09-08'}]};
 assert.equal(valorComJuros(a,data(2026,10,8)),100);
 assert.deepEqual(competenciasDoPagamento({data_pagamento:'2026-10-08',competencias_quitadas:[]}),[]);
});
test('datas de cadastro não criam dívidas antigas sem revisão',()=>{
 const a={mensalidade:100,vencimento:5,dataInicio:'2024-01-01'};
 assert.deepEqual(mensalidadesEmAberto(a,data(2026,10,8)).map(l=>l.competencia),['2026-10']);
});
test('virada do ano e fevereiro com vencimento 31',()=>{
 const a={...aluno,inicioFinanceiro:'2025-12-01',vencimento:31};
 assert.deepEqual(mensalidadesEmAberto(a,data(2026,1,2)).map(l=>[l.competencia,l.dias_atraso]),[['2025-12',2],['2026-01',0]]);
 const f={...aluno,inicioFinanceiro:'2028-02-01',vencimento:31};
 assert.deepEqual(mensalidadesEmAberto(f,data(2028,3,1)).map(l=>[l.vencimento,l.dias_atraso]),[['2028-02-29',1],['2028-03-31',0]]);
});
test('não cobra meses anteriores ao início revisado nem meses futuros',()=>{
 assert.equal(mensalidadesEmAberto({...aluno,inicioFinanceiro:'2026-11-01'},data(2026,10,8)).length,0);
 assert.equal(valorComJuros({...aluno,inicioFinanceiro:'2026-10-01'},data(2026,10,8)),100);
});
test('centavos sem concatenação ou acumulação de erro binário',()=>{
 const a={...aluno,mensalidade:'100.10',vencimento:31};
 assert.equal(valorComJuros(a,data(2026,10,1)),200.2); // setembro 111.10 + outubro 100.10
});
test('histórico local também preserva competências ao recarregar',()=>{
 const a={mensalidade:100,vencimento:5,inicioFinanceiro:'2026-09-01',historicoPagamentos:[{data:'08/10/2026',valor:256,competencias_quitadas:['2026-09','2026-10']}]};
 assert.equal(valorComJuros(JSON.parse(JSON.stringify(a)),data(2026,10,8)),0);
});
test('lista online autoritativa vazia não usa status ou histórico antigo para quitar',()=>{
 const a={...aluno,statusPagamento:'Pago',ultimoPagamento:'08/10/2026',historicoPagamentos:[{data:'08/10/2026'}]};
 assert.equal(valorComJuros(a,data(2026,10,8)),238);
});
