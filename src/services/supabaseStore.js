import { supabase, supabaseConfigurado } from "../lib/supabaseClient";
import {
  alunoDoBanco,
  alunoParaBanco,
  presencaDoBanco,
  presencaParaBanco,
} from "./supabaseMappers";

function exigirSupabase() {
  if (!supabaseConfigurado || !supabase) {
    throw new Error("Supabase ainda não configurado.");
  }
}

function detalharErroSupabase(error) {
  return [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ");
}

function idSupabaseValido(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}


const COLUNAS_ALUNO_LISTA = [
  "id",
  "nome",
  "telefone",
  "faixa",
  "grau",
  "responsavel",
  "data_nascimento",
  "data_inicio",
  "peso",
  "mensalidade",
  "vencimento",
  "status_pagamento",
  "ultimo_pagamento",
  "tipo_sanguineo",
  "saude",
  "medicamentos",
  "observacoes",
  "observacao_financeira",
  "foto_url",
  "auth_user_id",
].join(",");

const COLUNAS_ALUNO_LISTA_SEM_AUTH = COLUNAS_ALUNO_LISTA
  .split(",")
  .filter((coluna) => coluna !== "auth_user_id")
  .join(",");

function erroColunaInexistente(error, coluna) {
  return (
    ["42703", "PGRST204"].includes(error?.code) &&
    String(error.message || "").includes(coluna)
  );
}

function fotoPublica(valorFoto) {
  const foto = String(valorFoto || "").trim();

  if (!foto || foto.startsWith("data:image/") || /^https?:\/\//i.test(foto)) {
    return foto;
  }

  const caminho = foto
    .replace(/^\/+/, "")
    .replace(/^fotos-alunos\//, "");

  return supabase.storage.from("fotos-alunos").getPublicUrl(caminho).data.publicUrl;
}

function alunoOnlineDoBanco(linha) {
  const aluno = alunoDoBanco(linha);
  const foto = fotoPublica(aluno.foto || linha?.foto_url);

  return {
    ...aluno,
    foto,
    fotoUrl: foto,
  };
}

async function obterAcademiaAtual() {
  const { data: sessao, error: erroSessao } = await supabase.auth.getSession();

  if (erroSessao) throw erroSessao;

  const userId = sessao.session?.user?.id;

  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("academia_id")
    .eq("id", userId)
    .single();

  if (erroColunaInexistente(error, "academia_id")) return null;
  if (error) throw error;
  return data?.academia_id || null;
}

export async function listarAlunosOnline() {
  exigirSupabase();

  let { data, error } = await supabase
    .from("alunos")
    .select(COLUNAS_ALUNO_LISTA)
    .order("nome", { ascending: true });

  if (erroColunaInexistente(error, "auth_user_id")) {
    ({ data, error } = await supabase
      .from("alunos")
      .select(COLUNAS_ALUNO_LISTA_SEM_AUTH)
      .order("nome", { ascending: true }));
  }

  if (error) throw new Error(detalharErroSupabase(error) || "Erro ao listar alunos online.");
  return data.map(alunoOnlineDoBanco);
}

export async function salvarAlunoOnline(aluno) {
  exigirSupabase();

  const linha = alunoParaBanco(aluno);
  linha.academia_id = linha.academia_id || (await obterAcademiaAtual()) || undefined;
  await salvarFotoLinhaNoStorage(linha);

  async function salvarLinhaAluno(linhaAluno) {
    return supabase
      .from("alunos")
      .upsert(linhaAluno, { onConflict: "id" })
      .select()
      .single();
  }

  let { data, error } = await salvarLinhaAluno(linha);

  if (erroColunaInexistente(error, "academia_id")) {
    delete linha.academia_id;
    ({ data, error } = await salvarLinhaAluno(linha));
  }

  if (erroColunaInexistente(error, "auth_user_id")) {
    delete linha.auth_user_id;
    ({ data, error } = await salvarLinhaAluno(linha));
  }

  if (error) {
    throw new Error(detalharErroSupabase(error) || "Erro desconhecido ao salvar aluno.");
  }

  if (!data?.id) {
    throw new Error("O banco nao retornou o ID do aluno salvo.");
  }

  const { data: confirmado, error: erroConfirmacao } = await supabase
    .from("alunos")
    .select(COLUNAS_ALUNO_LISTA_SEM_AUTH)
    .eq("id", data.id)
    .single();

  if (erroConfirmacao) {
    throw new Error(
      `Aluno enviado, mas nao foi possivel confirmar a leitura no banco: ${
        detalharErroSupabase(erroConfirmacao) || "erro desconhecido"
      }`
    );
  }

  return alunoOnlineDoBanco(confirmado);
}

export async function atualizarPerfilAlunoOnline(id, campos) {
  exigirSupabase();

  const linha = {
    telefone: campos.telefone || null,
    responsavel: campos.responsavel || null,
    tipo_sanguineo: campos.tipo_sanguineo || null,
    saude: campos.saude || null,
    medicamentos: campos.medicamentos || null,
    observacoes: campos.observacoes || null,
    foto_url: campos.foto_url || null,
  };

  const { data, error } = await supabase
    .from("alunos")
    .update(linha)
    .eq("id", id)
    .select(COLUNAS_ALUNO_LISTA_SEM_AUTH)
    .single();

  if (error) {
    throw new Error(detalharErroSupabase(error) || "Erro desconhecido ao atualizar perfil do aluno.");
  }

  return alunoOnlineDoBanco(data);
}

export async function obterAlunoOnline(id) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return alunoOnlineDoBanco(data);
}

export async function obterAlunoDoUsuarioOnline(userId) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? alunoOnlineDoBanco(data) : null;
}

export async function obterFotoAlunoOnline(id) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("alunos")
    .select("foto_url")
    .eq("id", id)
    .single();

  if (error) throw error;
  return fotoPublica(data?.foto_url);
}

export async function buscarUsuarioSistemaOnline(usuario) {
  exigirSupabase();

  const { data: usuarioRpc, error: erroRpc } = await supabase
    .rpc("verificar_usuario_sistema", { usuario_login: usuario })
    .maybeSingle();

  if (!erroRpc && usuarioRpc) {
    return usuarioSistemaDoBanco(usuarioRpc);
  }

  if (erroRpc && !["42883", "PGRST202"].includes(erroRpc.code)) {
    console.warn("Falha ao usar login seguro de usuarios_sistema. Tentando consulta legada.", erroRpc);
  }

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .ilike("usuario", usuario)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return usuarioSistemaDoBanco(data);
}

export async function salvarUsuarioSistemaOnline(usuario) {
  exigirSupabase();

  const linha = {
    usuario: usuario.usuario,
    senha: String(usuario.senha),
    cargo: usuario.cargo,
    nome: usuario.nome,
    aluno_id: usuario.alunoId || null,
    academia_id: usuario.academiaId || null,
  };

  linha.academia_id = linha.academia_id || (await obterAcademiaAtual()) || undefined;

  const { data: existente, error: erroBusca } = await supabase
    .from("usuarios_sistema")
    .select("id")
    .ilike("usuario", usuario.usuario)
    .maybeSingle();

  if (erroBusca) throw erroBusca;

  async function salvarLinhaUsuario(linhaUsuario) {
    if (existente) {
      return supabase
        .from("usuarios_sistema")
        .update(linhaUsuario)
        .eq("id", existente.id)
        .select()
        .single();
    }

    return supabase
      .from("usuarios_sistema")
      .insert(linhaUsuario)
      .select()
      .single();
  }

  let { data, error } = await salvarLinhaUsuario(linha);

  if (erroColunaInexistente(error, "academia_id")) {
    delete linha.academia_id;
    ({ data, error } = await salvarLinhaUsuario(linha));
  }

  if (error) throw error;
  return data;
}

export async function removerUsuarioSistemaOnlinePorAluno(idAluno) {
  exigirSupabase();

  const { error } = await supabase
    .from("usuarios_sistema")
    .delete()
    .eq("aluno_id", idAluno);

  if (error) throw error;
}

export async function resetarSenhaAlunoAuthOnline(idAluno, senha = "123456") {
  exigirSupabase();

  const { data, error } = await supabase.functions.invoke("reset-student-password", {
    body: {
      aluno_id: idAluno,
      password: senha,
    },
  });

  if (error) {
    throw new Error(detalharErroSupabase(error) || "Erro desconhecido ao resetar senha do aluno.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export async function criarAlunoAuthOnline(idAluno, email, password) {
  exigirSupabase();

  const { data, error } = await supabase.functions.invoke("create-student-auth", {
    body: {
      aluno_id: idAluno,
      email,
      password,
    },
  });

  if (error) {
    throw new Error(detalharErroSupabase(error) || "Erro desconhecido ao criar acesso Auth do aluno.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export async function atualizarEmailAlunoAuthOnline(idAluno, novoEmail) {
  exigirSupabase();

  const { data, error } = await supabase.functions.invoke("update-student-auth-email", {
    body: {
      aluno_id: idAluno,
      novo_email: novoEmail,
    },
  });

  if (error) {
    throw new Error(detalharErroSupabase(error) || "Erro desconhecido ao corrigir e-mail Auth do aluno.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export async function removerAlunoOnline(id) {
  exigirSupabase();

  const { error } = await supabase.from("alunos").delete().eq("id", id);

  if (error) throw error;
}

export async function listarPresencasOnline() {
  exigirSupabase();

  const { data, error } = await supabase
    .from("presencas")
    .select("id,aluno_id,data,hora,criado_em")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data.map(presencaDoBanco);
}

export async function listarPagamentosOnline() {
  exigirSupabase();

  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return Promise.all(
    data.map(async (pagamento) => ({
      ...pagamento,
      comprovante_path: pagamento.comprovante_url || "",
      comprovante_url: await arquivoVisualizavel("comprovantes", pagamento.comprovante_url),
    }))
  );
}

export async function registrarPresencaOnline(presenca) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("presencas")
    .insert(presencaParaBanco(presenca))
    .select()
    .single();

  if (error) throw error;
  return presencaDoBanco(data);
}

export async function migrarAlunosOnline(alunos) {
  exigirSupabase();

  const academiaId = await obterAcademiaAtual();

  const alunosMigrados = [];

  for (const aluno of alunos) {
    const linha = alunoParaBanco(aluno);
    linha.academia_id = linha.academia_id || academiaId || undefined;

    if (!idSupabaseValido(linha.id)) {
      delete linha.id;

      let consultaExistente = supabase
        .from("alunos")
        .select("id,nome")
        .ilike("nome", linha.nome);

      if (linha.academia_id) {
        consultaExistente = consultaExistente.eq("academia_id", linha.academia_id);
      }

      let { data: existente, error: erroBusca } = await consultaExistente.maybeSingle();

      if (erroColunaInexistente(erroBusca, "academia_id")) {
        delete linha.academia_id;
        ({ data: existente, error: erroBusca } = await supabase
          .from("alunos")
          .select("id,nome")
          .ilike("nome", linha.nome)
          .maybeSingle());
      }

      if (erroBusca) {
        throw new Error(detalharErroSupabase(erroBusca) || "Erro ao buscar aluno existente.");
      }

      if (existente?.id) {
        linha.id = existente.id;
      } else if (typeof crypto !== "undefined" && crypto.randomUUID) {
        linha.id = crypto.randomUUID();
      }
    }

    await salvarFotoLinhaNoStorage(linha);
    alunosMigrados.push(await salvarAlunoOnline(linha));
  }

  return alunosMigrados;
}

export async function salvarPagamentoOnline(pagamento) {
  exigirSupabase();

  const linha = {
    ...pagamento,
    comprovante_url: pagamento.comprovante_path || pagamento.comprovante_url || null,
  };
  delete linha.comprovante_path;

  const { data, error } = await supabase
    .from("pagamentos")
    .upsert(linha)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarPagamentoOnlinePorId(id, campos) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("pagamentos")
    .update(campos)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function confirmarPagamentoOnline(pagamento) {
  exigirSupabase();

  const linha = {
    valor: pagamento.valor,
    status: "Pago",
    data_pagamento: pagamento.data_pagamento,
    comprovante_url: pagamento.comprovante_path || pagamento.comprovante_url || null,
  };

  const { data: atualizados, error: erroAtualizar } = await supabase
    .from("pagamentos")
    .update(linha)
    .eq("aluno_id", pagamento.aluno_id)
    .in("status", ["Aguardando", "Pendente"])
    .select();

  if (erroAtualizar) throw erroAtualizar;

  if (atualizados && atualizados.length > 0) {
    return atualizados[0];
  }

  return salvarPagamentoOnline({
    ...pagamento,
    status: "Pago",
  });
}

export async function enviarArquivoOnline(bucket, caminho, arquivo) {
  exigirSupabase();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(caminho, arquivo, { upsert: true });

  if (error) throw error;
  return data;
}

export async function enviarDataUrlOnline(bucket, caminho, dataUrl) {
  const arquivo = dataUrlParaBlob(dataUrl);

  return enviarArquivoOnline(bucket, caminho, arquivo);
}

export async function listarAvisosOnline() {
  exigirSupabase();

  const { data, error } = await supabase
    .from("avisos")
    .select("id,mensagem,criado_em")
    .order("criado_em", { ascending: false });

  if (error) throw error;

  return data.map((aviso) => ({
    id: aviso.id,
    mensagem: aviso.mensagem,
    data: new Date(aviso.criado_em).toLocaleString(),
  }));
}

export async function salvarAvisoOnline(mensagem) {
  exigirSupabase();

  const { data, error } = await supabase
    .from("avisos")
    .insert({ mensagem })
    .select("id,mensagem,criado_em")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    mensagem: data.mensagem,
    data: new Date(data.criado_em).toLocaleString(),
  };
}

export async function limparAvisosOnline() {
  exigirSupabase();

  const { error } = await supabase
    .from("avisos")
    .delete()
    .not("id", "is", null);

  if (error) throw error;
}

async function arquivoVisualizavel(bucket, valor) {
  const caminho = String(valor || "").trim();

  if (!caminho || caminho.startsWith("data:") || /^https?:\/\//i.test(caminho)) {
    return caminho;
  }

  if (bucket === "fotos-alunos") {
    return fotoPublica(caminho);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(caminho.replace(/^\/+/, "").replace(new RegExp(`^${bucket}/`), ""), 60 * 60);

  if (error) {
    console.error("Erro ao gerar link assinado do arquivo.", error);
    return caminho;
  }

  return data?.signedUrl || caminho;
}

function dataUrlParaBlob(dataUrl) {
  const [cabecalho, base64] = String(dataUrl || "").split(",");
  const tipo = cabecalho?.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";
  const binario = atob(base64 || "");
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  return new Blob([bytes], { type: tipo });
}

function usuarioSistemaDoBanco(data) {
  return {
    id: data.id,
    usuario: data.usuario,
    senha: data.senha,
    cargo: data.cargo,
    nome: data.nome,
    alunoId: data.aluno_id,
    academiaId: data.academia_id,
    origem: "usuarios_sistema",
  };
}

async function salvarFotoLinhaNoStorage(linha) {
  if (!String(linha.foto_url || "").startsWith("data:image/")) return;
  if (!idSupabaseValido(linha.id)) return;

  const tipo = String(linha.foto_url).match(/^data:(.*?);base64/)?.[1] || "image/jpeg";
  const extensao = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
  const academiaId = linha.academia_id || (await obterAcademiaAtual()) || "sem-academia";
  const caminho = `${academiaId}/alunos/${linha.id}/foto-${Date.now()}.${extensao}`;

  await enviarDataUrlOnline("fotos-alunos", caminho, linha.foto_url);
  linha.foto_url = caminho;
}
