import { supabase } from './supabase.js';

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

const CATEGORIAS_PADRAO = [
  ...['Vendas', 'Serviços', 'Outras entradas'].map((nome) => ({ nome, tipo: 'entrada' })),
  ...['Fornecedores', 'Aluguel', 'Salários', 'Energia e água', 'Impostos', 'Marketing', 'Outras despesas']
    .map((nome) => ({ nome, tipo: 'saida' })),
];

export async function listarCategorias() {
  return ok(await supabase.from('categorias').select('*').order('nome'));
}

export async function criarCategoria(nome, tipo) {
  ok(await supabase.from('categorias').insert({ nome, tipo }));
}

export async function excluirCategoria(id) {
  ok(await supabase.from('categorias').delete().eq('id', id));
}

// No primeiro acesso, cria as categorias mais comuns.
export async function garantirCategoriasPadrao() {
  const atuais = await listarCategorias();
  if (atuais.length) return atuais;
  ok(await supabase.from('categorias').insert(CATEGORIAS_PADRAO));
  return listarCategorias();
}

export async function listarLancamentos({ inicio, fim }) {
  return ok(
    await supabase
      .from('lancamentos')
      .select('*, categorias(nome)')
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
  );
}

export async function salvarLancamento(l) {
  if (l.id) {
    const { id, ...resto } = l;
    ok(await supabase.from('lancamentos').update(resto).eq('id', id));
  } else {
    ok(await supabase.from('lancamentos').insert(l));
  }
}

export async function excluirLancamento(id) {
  ok(await supabase.from('lancamentos').delete().eq('id', id));
}
