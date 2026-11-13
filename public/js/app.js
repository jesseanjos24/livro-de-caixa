import { exigirSessao, sair } from './auth.js';
import * as db from './dados.js';
import { fmtMoeda, dataISO, mesAtual, limitesDoMes, somarMes, fmtData, el } from './util.js';
import './pwa.js';

const $ = (id) => document.getElementById(id);
const FORMAS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Outro'];
const estado = { mes: mesAtual(), categorias: [], lancamentos: [] };

/* ---------- avisos ---------- */
let timerAviso;
function aviso(msg, erro = false) {
  const a = $('aviso');
  a.textContent = msg;
  a.className = erro ? 'aviso aviso-erro' : 'aviso';
  a.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { a.hidden = true; }, 3500);
}

const vazio = (txt) => el('li', { class: 'vazio' }, txt);

// Largura definida via CSSOM (style.width) para funcionar com a política CSP, que bloqueia style="" inline.
function barraCategoria(fracao) {
  const barra = el('span');
  barra.style.width = `${fracao * 100}%`;
  return barra;
}

/* ---------- carga de dados ---------- */
async function carregar() {
  const { inicio, fim } = limitesDoMes(estado.mes);
  const dados = await db.listarLancamentos({ inicio, fim });
  estado.lancamentos = dados.map((l) => ({ ...l, valor: Number(l.valor) }));
  renderPainel();
  renderLista();
}

async function recarregar() {
  try {
    await carregar();
  } catch (e) {
    console.error(e);
    aviso('Não foi possível carregar os dados. Verifique a conexão.', true);
  }
}

/* ---------- painel ---------- */
function totais() {
  let e = 0;
  let s = 0;
  for (const l of estado.lancamentos) {
    const c = Math.round(l.valor * 100); // soma em centavos evita erro de ponto flutuante
    if (l.tipo === 'entrada') e += c; else s += c;
  }
  return { entradas: e / 100, saidas: s / 100, lucro: (e - s) / 100 };
}

function renderPainel() {
  const t = totais();
  $('lucro').textContent = fmtMoeda(t.lucro);
  $('lucro').className = `lucro ${t.lucro < 0 ? 'saida' : 'entrada'}`;
  $('total-entradas').textContent = fmtMoeda(t.entradas);
  $('total-saidas').textContent = fmtMoeda(t.saidas);

  const soma = t.entradas + t.saidas;
  $('barra-entrada').style.width = soma ? `${(t.entradas / soma) * 100}%` : '0';
  $('barra-saida').style.width = soma ? `${(t.saidas / soma) * 100}%` : '0';

  // despesas por categoria
  const mapa = new Map();
  for (const l of estado.lancamentos.filter((x) => x.tipo === 'saida')) {
    const nome = l.categorias?.nome ?? 'Sem categoria';
    mapa.set(nome, (mapa.get(nome) ?? 0) + Math.round(l.valor * 100));
  }
  const itens = [...mapa].sort((a, b) => b[1] - a[1]);
  const max = itens[0]?.[1] ?? 1;
  $('por-categoria').replaceChildren(
    ...(itens.length
      ? itens.map(([nome, c]) => el('li', { class: 'cat-linha' },
          el('div', { class: 'cat-topo' }, el('span', {}, nome), el('span', { class: 'saida' }, fmtMoeda(c / 100))),
          el('div', { class: 'cat-barra' }, barraCategoria(c / max))))
      : [vazio('Nenhuma saída neste mês.')])
  );

  const recentes = estado.lancamentos.slice(0, 5);
  $('recentes').replaceChildren(
    ...(recentes.length
      ? recentes.map((l) => itemLancamento(l, false))
      : [vazio('Nenhum lançamento neste mês. Toque em "Novo lançamento" para começar.')])
  );
}

/* ---------- lista de lançamentos ---------- */
function itemLancamento(l, comAcoes) {
  const sinal = l.tipo === 'entrada' ? '+ ' : '− ';
  const titulo = l.descricao || l.categorias?.nome || (l.tipo === 'entrada' ? 'Entrada' : 'Saída');
  return el('li', { class: 'lanc' },
    el('div', { class: 'lanc-info' },
      el('p', { class: 'lanc-titulo' }, titulo),
      el('p', { class: 'meta' },
        el('span', {}, fmtData(l.data)),
        el('span', {}, l.categorias?.nome ?? 'Sem categoria'),
        l.forma_pagamento && el('span', {}, l.forma_pagamento))),
    el('div', { class: 'lanc-dir' },
      el('p', { class: `valor ${l.tipo}` }, sinal + fmtMoeda(l.valor)),
      comAcoes && el('div', { class: 'lanc-acoes' },
        el('button', { class: 'link', type: 'button', 'aria-label': `Editar ${titulo}`, onclick: () => abrirForm(l) }, 'Editar'),
        el('button', { class: 'link perigo', type: 'button', 'aria-label': `Excluir ${titulo}`, onclick: () => excluirLancamento(l) }, 'Excluir'))));
}

function lancamentosFiltrados() {
  const tipo = $('filtro-tipo').value;
  const cat = $('filtro-categoria').value;
  return estado.lancamentos.filter((l) => (!tipo || l.tipo === tipo) && (!cat || l.categoria_id === cat));
}

function renderLista() {
  const lista = lancamentosFiltrados();
  $('contagem').textContent = `${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}`;
  $('lista-lanc').replaceChildren(
    ...(lista.length ? lista.map((l) => itemLancamento(l, true)) : [vazio('Nenhum lançamento com esses filtros.')])
  );
}

async function excluirLancamento(l) {
  if (!confirm('Excluir este lançamento? Essa ação não pode ser desfeita.')) return;
  try {
    await db.excluirLancamento(l.id);
    aviso('Lançamento excluído.');
    await carregar();
  } catch (e) {
    console.error(e);
    aviso('Não foi possível excluir. Tente de novo.', true);
  }
}

/* ---------- formulário de lançamento ---------- */
function preencherCategoriasDoForm(tipo, selecionada = '') {
  const sel = $('f-categoria');
  sel.replaceChildren(
    el('option', { value: '' }, 'Sem categoria'),
    ...estado.categorias.filter((c) => c.tipo === tipo).map((c) => el('option', { value: c.id }, c.nome))
  );
  sel.value = selecionada;
}

function abrirForm(l = null) {
  $('f-erro').hidden = true;
  $('dlg-titulo').textContent = l ? 'Editar lançamento' : 'Novo lançamento';
  $('f-id').value = l?.id ?? '';
  const tipo = l?.tipo ?? 'entrada';
  document.querySelector(`input[name="tipo"][value="${tipo}"]`).checked = true;
  $('f-valor').value = l ? l.valor.toFixed(2) : '';
  preencherCategoriasDoForm(tipo, l?.categoria_id ?? '');
  $('f-descricao').value = l?.descricao ?? '';
  $('f-data').value = l?.data ?? dataISO();
  $('f-pagamento').value = l?.forma_pagamento ?? 'Dinheiro';
  $('dlg').showModal();
  $('f-valor').focus();
}

async function salvarForm(e) {
  e.preventDefault();
  const erro = $('f-erro');
  const valor = Number($('f-valor').value);
  if (!(valor > 0)) {
    erro.textContent = 'Informe um valor maior que zero.';
    erro.hidden = false;
    return;
  }
  const l = {
    tipo: document.querySelector('input[name="tipo"]:checked').value,
    valor,
    categoria_id: $('f-categoria').value || null,
    descricao: $('f-descricao').value.trim() || null,
    data: $('f-data').value,
    forma_pagamento: $('f-pagamento').value || null,
  };
  const id = $('f-id').value;
  if (id) l.id = id;

  $('f-salvar').disabled = true;
  try {
    await db.salvarLancamento(l);
    $('dlg').close();
    aviso(id ? 'Lançamento atualizado.' : 'Lançamento salvo.');
    estado.mes = l.data.slice(0, 7); // mostra o mês do lançamento salvo
    $('mes').value = estado.mes;
    await carregar();
  } catch (err) {
    console.error(err);
    erro.textContent = 'Não foi possível salvar. Tente de novo.';
    erro.hidden = false;
  } finally {
    $('f-salvar').disabled = false;
  }
}

/* ---------- categorias ---------- */
function renderCategorias() {
  for (const tipo of ['entrada', 'saida']) {
    const cats = estado.categorias.filter((c) => c.tipo === tipo);
    $(`cats-${tipo}`).replaceChildren(
      ...(cats.length
        ? cats.map((c) => el('li', { class: 'cat-item' },
            el('span', {}, c.nome),
            el('button', { class: 'link perigo', type: 'button', 'aria-label': `Excluir categoria ${c.nome}`, onclick: () => excluirCategoria(c) }, 'Excluir')))
        : [vazio('Nenhuma categoria.')])
    );
  }
  const filtro = $('filtro-categoria');
  const atual = filtro.value;
  filtro.replaceChildren(
    el('option', { value: '' }, 'Todas as categorias'),
    ...estado.categorias.map((c) => el('option', { value: c.id }, `${c.nome} (${c.tipo === 'entrada' ? 'entrada' : 'saída'})`))
  );
  filtro.value = estado.categorias.some((c) => c.id === atual) ? atual : '';
}

async function recarregarCategorias() {
  estado.categorias = await db.listarCategorias();
  renderCategorias();
}

async function adicionarCategoria(e) {
  e.preventDefault();
  const nome = $('cat-nome').value.trim();
  if (!nome) return;
  try {
    await db.criarCategoria(nome, $('cat-tipo').value);
    $('cat-nome').value = '';
    aviso('Categoria adicionada.');
    await recarregarCategorias();
  } catch (err) {
    console.error(err);
    aviso(err?.code === '23505' ? 'Essa categoria já existe.' : 'Não foi possível adicionar a categoria.', true);
  }
}

async function excluirCategoria(c) {
  if (!confirm(`Excluir a categoria "${c.nome}"? Os lançamentos dela ficam sem categoria.`)) return;
  try {
    await db.excluirCategoria(c.id);
    aviso('Categoria excluída.');
    await recarregarCategorias();
    await carregar();
  } catch (err) {
    console.error(err);
    aviso('Não foi possível excluir a categoria.', true);
  }
}

/* ---------- CSV ---------- */
function celulaCsv(valor) {
  let t = String(valor ?? '');
  if (/^[=+\-@]/.test(t)) t = `'${t}`; // evita que o Excel trate texto como fórmula
  return `"${t.replaceAll('"', '""')}"`;
}

function baixarCsv() {
  const lista = lancamentosFiltrados();
  if (!lista.length) {
    aviso('Não há lançamentos para baixar.', true);
    return;
  }
  const linhas = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Forma de pagamento', 'Valor']];
  for (const l of lista) {
    linhas.push([
      fmtData(l.data),
      l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      l.categorias?.nome ?? '',
      l.descricao ?? '',
      l.forma_pagamento ?? '',
      (l.tipo === 'entrada' ? l.valor : -l.valor).toFixed(2).replace('.', ','),
    ]);
  }
  // BOM + ponto e vírgula: o Excel em português abre com acentos e colunas corretos.
  const csv = '\uFEFF' + linhas.map((r) => r.map(celulaCsv).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = el('a', { href: url, download: `lancamentos-${estado.mes}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- navegação ---------- */
function mostrarVista(nome) {
  for (const v of document.querySelectorAll('.vista')) v.hidden = v.id !== `vista-${nome}`;
  for (const b of document.querySelectorAll('.aba')) {
    b.setAttribute('aria-current', b.dataset.vista === nome ? 'page' : 'false');
  }
  $('seletor-mes').hidden = nome === 'categorias';
  $('btn-novo').hidden = nome === 'categorias';
}

function mudarMes(novo) {
  if (!/^\d{4}-\d{2}$/.test(novo)) return;
  estado.mes = novo;
  $('mes').value = novo;
  recarregar();
}

function ligarEventos() {
  $('btn-sair').addEventListener('click', sair);
  $('btn-novo').addEventListener('click', () => abrirForm());
  $('mes-ant').addEventListener('click', () => mudarMes(somarMes(estado.mes, -1)));
  $('mes-prox').addEventListener('click', () => mudarMes(somarMes(estado.mes, 1)));
  $('mes').addEventListener('change', (e) => mudarMes(e.target.value));
  for (const b of document.querySelectorAll('.aba')) b.addEventListener('click', () => mostrarVista(b.dataset.vista));

  $('filtro-tipo').addEventListener('change', renderLista);
  $('filtro-categoria').addEventListener('change', renderLista);
  $('btn-csv').addEventListener('click', baixarCsv);

  $('form-lanc').addEventListener('submit', salvarForm);
  $('f-cancelar').addEventListener('click', () => $('dlg').close());
  $('dlg').addEventListener('click', (e) => { if (e.target === $('dlg')) $('dlg').close(); });
  for (const r of document.querySelectorAll('input[name="tipo"]')) {
    r.addEventListener('change', () => preencherCategoriasDoForm(r.value));
  }
  $('form-cat').addEventListener('submit', adicionarCategoria);
}

/* ---------- início ---------- */
async function iniciar() {
  if (!(await exigirSessao())) return;
  $('f-pagamento').replaceChildren(...FORMAS.map((f) => el('option', { value: f }, f)));
  $('mes').value = estado.mes;
  ligarEventos();
  try {
    estado.categorias = await db.garantirCategoriasPadrao();
    renderCategorias();
    await carregar();
  } catch (e) {
    console.error(e);
    aviso('Não foi possível carregar os dados. Verifique a conexão.', true);
  }
}

iniciar();
