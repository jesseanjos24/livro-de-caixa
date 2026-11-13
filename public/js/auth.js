import { supabase } from './supabase.js';

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
  location.replace('index.html');
}

// Páginas internas: sem sessão, volta para o login.
export async function exigirSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace('index.html');
    return null;
  }
  return session;
}

// Página de login: com sessão, vai direto para o app.
export async function redirecionarSeLogado() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.replace('app.html');
}
