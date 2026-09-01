import { supabase, supabaseConfigurado } from "../lib/supabaseClient";

function exigirSupabase() {
  if (!supabaseConfigurado || !supabase) {
    throw new Error("Supabase ainda não configurado.");
  }
}

export async function entrarComEmailSenha(email, senha) {
  exigirSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) throw error;
  return data;
}

export async function sairDoSupabase() {
  exigirSupabase();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function atualizarSenhaUsuarioAtual(novaSenha) {
  exigirSupabase();

  const { data, error } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (error) throw error;
  return data;
}

export async function obterSessaoSupabase() {
  if (!supabaseConfigurado || !supabase) return null;

  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  return data.session;
}

export async function obterPerfilSupabase(userIdInformado = "") {
  exigirSupabase();

  let userId = userIdInformado;

  if (!userId) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    userId = sessionData.session?.user?.id;
  }

  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
