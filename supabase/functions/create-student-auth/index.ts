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

  console.error("create-student-auth", {
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
      console.error("create-student-auth", {
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

    let body: { aluno_id?: string; email?: string; password?: string };

    try {
      body = await req.json();
    } catch (error) {
      logErro("parse-body", error);
      return jsonResponse({ error: "Corpo da requisicao invalido." }, 400);
    }

    const alunoId = body.aluno_id;
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!alunoId || !email || !password) {
      return jsonResponse({ error: "Informe aluno_id, email e password." }, 400);
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
      return jsonResponse({ error: "Apenas diretor pode criar acesso de aluno." }, 403);
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

    if (aluno.auth_user_id) {
      return jsonResponse({ error: "Aluno ja possui conta Supabase Auth vinculada." }, 409);
    }

    const { data: usuarioCriado, error: erroCriarUsuario } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          cargo: "aluno",
          aluno_id: aluno.id,
          academia_id: aluno.academia_id,
        },
      });

    if (erroCriarUsuario || !usuarioCriado.user) {
      logErro("auth-admin-create-user", erroCriarUsuario, {
        alunoId,
        email,
      });
      return jsonResponse({ error: erroCriarUsuario?.message || "Nao foi possivel criar usuario Auth do aluno." }, 500);
    }

    const authUserId = usuarioCriado.user.id;

    try {
      const { data: alunoVinculado, error: erroAtualizarAluno } = await supabaseAdmin
        .from("alunos")
        .update({ auth_user_id: authUserId })
        .eq("id", aluno.id)
        .is("auth_user_id", null)
        .select("id,auth_user_id")
        .single();

      if (erroAtualizarAluno) {
        throw erroAtualizarAluno;
      }

      if (alunoVinculado?.id !== aluno.id || alunoVinculado?.auth_user_id !== authUserId) {
        throw new Error("Vinculo do usuario Auth ao aluno nao foi confirmado.");
      }

      const { error: erroSalvarProfile } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: authUserId,
            nome: aluno.nome,
            cargo: "aluno",
            aluno_id: aluno.id,
            academia_id: aluno.academia_id,
          },
          { onConflict: "id" }
        );

      if (erroSalvarProfile) {
        throw erroSalvarProfile;
      }
    } catch (error) {
      logErro("vincular-auth-ao-aluno", error, {
        alunoId,
        authUserCriado: true,
      });

      const { error: erroRollback } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (erroRollback) {
        logErro("rollback-delete-auth-user", erroRollback, {
          alunoId,
          authUserCriado: true,
        });
      }

      return jsonResponse({ error: "Conta Auth criada, mas o vinculo com o aluno falhou. A conta Auth foi removida para evitar usuario orfao." }, 500);
    }

    return jsonResponse({ ok: true, auth_user_id: authUserId });
  } catch (error) {
    logErro("erro-nao-tratado", error);
    return jsonResponse({ error: "Erro interno ao criar acesso Auth do aluno." }, 500);
  }
});
