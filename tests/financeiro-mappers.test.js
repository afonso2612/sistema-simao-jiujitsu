import test from 'node:test';
import assert from 'node:assert/strict';
import {alunoDoBanco, alunoParaBanco} from '../src/services/supabaseMappers.js';
test('salvar cadastro legado sem inicio não desativa cobrança revisada no banco',()=>{
 const linha=JSON.parse(JSON.stringify(alunoParaBanco({nome:'Legado',mensalidade:100,vencimento:5})));
 assert.equal(Object.hasOwn(linha,'inicio_financeiro'),false);
});
test('início revisado é persistido e recuperado no formato do calendário',()=>{
 const linha=alunoParaBanco({nome:'Aluno',mensalidade:100,vencimento:5,inicioFinanceiro:'2026-09-01'});
 assert.equal(linha.inicio_financeiro,'2026-09-01');assert.equal(alunoDoBanco(linha).inicioFinanceiro,'2026-09-01');
});
