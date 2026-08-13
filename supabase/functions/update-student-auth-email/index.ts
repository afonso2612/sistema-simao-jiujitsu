import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function logErro(etapa: string, error: unknown, contexto: Record<string, unknown> = {}) {
  const erro = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    status?: number;
  };

  console.error("update-student-auth-email", {
    etapa,
    contexto,
    erro: {
      message: erro?.message || String(error || "erro desconhecido"),
      code: erro?.code,
      details: erro?.details,
      hint: erro?.hint,
      status: erro?.status,
    },
  });
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Metodo nao permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("update-student-auth-email", {
        etapa: "configuracao",
        contexto: {
          temSupabaseUrl: Boolean(supabaseUrl),
          temAnonKey: Boolean(anonKey),
          temServiceRoleKey: Boolean(serviceRoleKey),
        },
      });
      return jsonResponse({ error: "Configuracao da Edge Function incompleta." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return jsonResponse({ error: "Sessao autenticada nao encontrada." }, 401);
    }

    let body: { aluno_id?: string; novo_email?: string };

    try {
      body = await req.json();
    } catch (error) {
      logErro("parse-body", error);
      return jsonResponse({ error: "Corpo da requisicao invalido." }, 400);
    }

    const alunoId = body.aluno_id;
    const novoEmail = String(body.novo_email || "").trim().toLowerCase();

    if (!alunoId || !novoEmail) {
      return jsonResponse({ error: "Informe aluno_id e novo_email." }, 400);
    }

    if (!emailValido(novoEmail)) {
      return jsonResponse({ error: "Informe um e-mail valido." }, 400);
    }

    const supabaseUsuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: usuarioAtual, error: erroUsuario } = await supabaseUsuario.auth.getUser(token);

    if (erroUsuario || !usuarioAtual.user) {
      logErro("validar-usuario-autenticado", erroUsuario, {
        temAuthUser: Boolean(usuarioAtual?.user),
      });
      return jsonResponse({ error: "Sessao invalida ou expirada." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: perfilDiretor, error: erroPerfilDiretor } = await supabaseAdmin
      .from("profiles")
      .select("id,cargo,academia_id")
      .eq("id", usuarioAtual.user.id)
      .single();

    if (erroPerfilDiretor || !perfilDiretor) {
      logErro("buscar-profile-diretor", erroPerfilDiretor, {
        temPerfil: Boolean(perfilDiretor),
      });
      return jsonResponse({ error: "Perfil do diretor nao encontrado." }, 403);
    }

    if (perfilDiretor.cargo !== "diretor") {
      return jsonResponse({ error: "Apenas diretor pode corrigir e-mail de acesso do aluno." }, 403);
    }

    if (!perfilDiretor.academia_id) {
      return jsonResponse({ error: "Diretor sem academia vinculada." }, 403);
    }

    const { data: aluno, error: erroAluno } = await supabaseAdmin
      .from("alunos")
      .select("id,nome,academia_id,auth_user_id")
      .eq("id", alunoId)
      .single();

    if (erroAluno || !aluno) {
      logErro("buscar-aluno", erroAluno, {
        alunoId,
        temAluno: Boolean(aluno),
      });
      return jsonResponse({ error: "Aluno nao encontrado." }, 404);
    }

    if (aluno.academia_id !== perfilDiretor.academia_id) {
      return jsonResponse({ error: "Aluno nao pertence a academia do diretor." }, 403);
    }

    if (!aluno.auth_user_id) {
      return jsonResponse({ error: "Aluno ainda nao possui conta Supabase Auth vinculada." }, 409);
    }

    const { data: usuarioDoAluno, error: erroBuscarUsuarioAluno } =
      await supabaseAdmin.auth.admin.getUserById(aluno.auth_user_id);

    if (erroBuscarUsuarioAluno || !usuarioDoAluno.user) {
      logErro("buscar-auth-user-aluno", erroBuscarUsuarioAluno, {
        alunoId,
        temAuthUser: Boolean(usuarioDoAluno?.user),
      });
      return jsonResponse({ error: "Usuario Auth vinculado ao aluno nao foi encontrado." }, 404);
    }

    const emailAtual = String(usuarioDoAluno.user.email || "").trim().toLowerCase();

    if (emailAtual === novoEmail) {
      return jsonResponse({
        ok: true,
        auth_user_id: aluno.auth_user_id,
        email: novoEmail,
      });
    }

    let pagina = 1;
    let encontrouOutroUsuario = false;

    while (!encontrouOutroUsuario) {
      const { data: usuarios, error: erroListarUsuarios } =
        await supabaseAdmin.auth.admin.listUsers({ page: pagina, perPage: 1000 });

      if (erroListarUsuarios) {
        logErro("verificar-email-existente", erroListarUsuarios, {
          alunoId,
          pagina,
        });
        return jsonResponse({ error: "Nao foi possivel verificar se o e-mail ja esta em uso." }, 500);
      }

      const usuarioComMesmoEmail = usuarios.users.find(
        (usuario) => String(usuario.email || "").trim().toLowerCase() === novoEmail
      );

      if (usuarioComMesmoEmail) {
        encontrouOutroUsuario = usuarioComMesmoEmail.id !== aluno.auth_user_id;
        break;
      }

      if (usuarios.users.length < 1000) {
        break;
      }

      pagina += 1;
    }

    if (encontrouOutroUsuario) {
      return jsonResponse({ error: "Este e-mail ja pertence a outro usuario Auth." }, 409);
    }

    const { data: usuarioAtualizado, error: erroAtualizarEmail } =
      await supabaseAdmin.auth.admin.updateUserById(aluno.auth_user_id, {
        email: novoEmail,
        email_confirm: true,
      });

    if (erroAtualizarEmail || !usuarioAtualizado.user) {
      logErro("auth-admin-update-email", erroAtualizarEmail, {
        alunoId,
      });
      return jsonResponse({ error: erroAtualizarEmail?.message || "Nao foi possivel atualizar o e-mail Auth do aluno." }, 500);
    }

    return jsonResponse({
      ok: true,
      auth_user_id: aluno.auth_user_id,
      email: usuarioAtualizado.user.email || novoEmail,
    });
  } catch (error) {
    logErro("erro-nao-tratado", error);
    return jsonResponse({ error: "Erro interno ao corrigir e-mail Auth do aluno." }, 500);
  }
});
