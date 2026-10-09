import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const origem = fs.readFileSync(new URL('../supabase/functions/reset-student-password/index.ts',import.meta.url),'utf8');
const codigo = stripTypeScriptTypes(origem.replace(/^import .*;\n/,''));
async function executar(opcoes={}) {
 const chamadas=[];
 const aluno={id:'aluno-1',nome:'Aluno',academia_id:'academia-1',auth_user_id:'auth-aluno',...opcoes.aluno};
 const diretor={id:'diretor-1',cargo:'diretor',academia_id:'academia-1',...opcoes.diretor};
 let handler;
 const admin={
  from(tabela) {
   let operacao='leitura';
   const q={select(){return q},eq(){return q},neq(){operacao='vinculos';return q},
    upsert(valor){chamadas.push(['profile',valor]);operacao='escrita';return q},
    single:async()=>({data:tabela==='alunos'?aluno:diretor,error:null}),
    maybeSingle:async()=>({data:opcoes.perfilAluno??null,error:opcoes.erroPerfil??null}),
    then(ok,erro){return Promise.resolve({data:operacao==='vinculos'?(opcoes.outros??[]):null,error:operacao==='escrita'?(opcoes.erroUpsert??null):null}).then(ok,erro)}
   };return q;
  },
  auth:{admin:{getUserById:async()=>({data:{user:opcoes.authAusente?null:{id:aluno.auth_user_id}},error:opcoes.erroAuth??null}),
   updateUserById:async(id,campos)=>{chamadas.push(['senha',id,campos]);return {error:opcoes.erroReset??null}}}}
 };
 const usuario={auth:{getUser:async()=>({data:{user:opcoes.semUsuario?null:{id:'diretor-1'}},error:null})}};
 vm.runInNewContext(codigo,{Deno:{env:{get:()=> 'mock-config'},serve:fn=>handler=fn},createClient:(url,key,opts)=>opts?.global?usuario:admin,Response,console:{error(){}}});
 const req=new Request('http://localhost/reset',{method:opcoes.method??'POST',headers:opcoes.semToken?{}:{Authorization:'Bearer mock'},body:opcoes.method==='OPTIONS'||opcoes.method==='GET'?undefined:JSON.stringify(opcoes.body??{aluno_id:'aluno-1',password:'nova senha '})});
 const resposta=await handler(req);
 return {status:resposta.status,chamadas,body:opcoes.method==='OPTIONS'?null:await resposta.json()};
}
test('repara profile ausente e preserva senha literalmente',async()=>{
 const r=await executar();assert.equal(r.status,200);assert.deepEqual(JSON.parse(JSON.stringify(r.chamadas)),[['profile',{id:'auth-aluno',nome:'Aluno',cargo:'aluno',aluno_id:'aluno-1',academia_id:'academia-1'}],['senha','auth-aluno',{password:'nova senha '}]]);
});
for(const [nome,opcoes,status] of [
 ['sem token',{semToken:true},401],['sessao invalida',{semUsuario:true},401],
 ['professor nao reseta',{diretor:{cargo:'professor'}},403],['diretor sem academia',{diretor:{academia_id:null}},403],
 ['outra academia',{aluno:{academia_id:'outra'}},403],['sem vinculo Auth',{aluno:{auth_user_id:null}},400],
 ['Auth inexistente',{authAusente:true,erroAuth:{status:404}},409],['falha temporaria Auth',{erroAuth:{status:503}},502],
 ['perfil diretor protegido',{perfilAluno:{cargo:'diretor'}},409],['perfil professor protegido',{perfilAluno:{cargo:'professor'}},409],
 ['outro aluno protegido',{perfilAluno:{cargo:'aluno',aluno_id:'outro'}},409],['outra academia protegida',{perfilAluno:{cargo:'aluno',academia_id:'outra'}},409],
 ['vinculo duplicado protegido',{outros:[{id:'outro'}]},409],['senha curta',{body:{aluno_id:'aluno-1',password:'123'}},400],
 ['erro leitura profile',{erroPerfil:{message:'offline'}},500],['metodo GET',{method:'GET'},405]
]) test(nome,async()=>{const r=await executar(opcoes);assert.equal(r.status,status);assert.equal(r.chamadas.length,0)});
test('falha no reparo nao troca senha',async()=>{const r=await executar({erroUpsert:{message:'falhou'}});assert.equal(r.status,500);assert.equal(r.chamadas.length,1)});
test('erro Auth ao atualizar nao informa sucesso',async()=>{const r=await executar({erroReset:{message:'falhou'}});assert.equal(r.status,500);assert.equal(r.body.ok,undefined)});
test('preflight CORS',async()=> assert.equal((await executar({method:'OPTIONS'})).status,200));
