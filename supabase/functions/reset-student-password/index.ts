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

  console.error("reset-student-password", {
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
      console.error("reset-student-password", {
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
      console.error("reset-student-password", {
        etapa: "authorization-header",
        contexto: { temAuthorization: Boolean(authHeader) },
      });
      return jsonResponse({ error: "Sessao autenticada nao encontrada." }, 401);
    }

    let body: { aluno_id?: string; password?: string };

    try {
      body = await req.json();
    } catch (error) {
      logErro("parse-body", error);
      return jsonResponse({ error: "Corpo da requisicao invalido." }, 400);
    }

    const alunoId = body.aluno_id;
    const novaSenha = body.password || "123456";

    if (!alunoId) {
      console.error("reset-student-password", {
        etapa: "validar-aluno-id",
        contexto: { temAlunoId: false },
      });
      return jsonResponse({ error: "Informe o aluno_id." }, 400);
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

    const { data: perfil, error: erroPerfil } = await supabaseAdmin
      .from("profiles")
      .select("id,cargo,academia_id")
      .eq("id", usuarioAtual.user.id)
      .single();

    if (erroPerfil || !perfil) {
      logErro("buscar-profile-diretor", erroPerfil, {
        temPerfil: Boolean(perfil),
      });
      return jsonResponse({ error: "Perfil do diretor nao encontrado." }, 403);
    }

    if (perfil.cargo !== "diretor") {
      console.error("reset-student-password", {
        etapa: "validar-cargo-diretor",
        contexto: { cargo: perfil.cargo || null },
      });
      return jsonResponse({ error: "Apenas diretor pode resetar senha de aluno." }, 403);
    }

    if (!perfil.academia_id) {
      console.error("reset-student-password", {
        etapa: "validar-academia-diretor",
        contexto: { temAcademiaDiretor: false },
      });
      return jsonResponse({ error: "Diretor sem academia vinculada." }, 403);
    }

    const { data: aluno, error: erroAluno } = await supabaseAdmin
      .from("alunos")
      .select("id,academia_id,auth_user_id")
      .eq("id", alunoId)
      .single();

    if (erroAluno || !aluno) {
      logErro("buscar-aluno", erroAluno, {
        alunoId,
        temAluno: Boolean(aluno),
      });
      return jsonResponse({ error: "Aluno nao encontrado." }, 404);
    }

    if (aluno.academia_id !== perfil.academia_id) {
      console.error("reset-student-password", {
        etapa: "validar-academia-aluno",
        contexto: {
          alunoId,
          academiaAlunoIgualDiretor: false,
          temAcademiaAluno: Boolean(aluno.academia_id),
          temAcademiaDiretor: Boolean(perfil.academia_id),
        },
      });
      return jsonResponse({ error: "Aluno nao pertence a academia do diretor." }, 403);
    }

    if (!aluno.auth_user_id) {
      console.error("reset-student-password", {
        etapa: "validar-auth-user-aluno",
        contexto: {
          alunoId,
          temAuthUserId: false,
        },
      });
      return jsonResponse({ error: "Aluno nao possui conta Supabase Auth vinculada." }, 400);
    }

    const { error: erroReset } = await supabaseAdmin.auth.admin.updateUserById(
      aluno.auth_user_id,
      { password: novaSenha }
    );

    if (erroReset) {
      logErro("auth-admin-update-user-password", erroReset, {
        alunoId,
        temAuthUserId: Boolean(aluno.auth_user_id),
      });
      return jsonResponse({ error: erroReset.message || "Nao foi possivel resetar a senha." }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    logErro("erro-nao-tratado", error);
    return jsonResponse({ error: "Erro interno ao resetar senha do aluno." }, 500);
  }
});
