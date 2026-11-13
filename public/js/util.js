const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtMoeda = (n) => moeda.format(n);

const dois = (n) => String(n).padStart(2, '0');

// Data local no formato AAAA-MM-DD (evita o desvio de fuso do toISOString).
export function dataISO(d = new Date()) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

export const mesAtual = () => dataISO().slice(0, 7);

export function limitesDoMes(ym) {
  const [a, m] = ym.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return { inicio: `${ym}-01`, fim: `${ym}-${dois(ultimo)}` };
}

export function somarMes(ym, delta) {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`;
}

export function fmtData(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Cria elementos sem innerHTML: textos entram como texto, nunca como HTML.
export function el(tag, props = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const f of filhos.flat()) {
    if (f === false || f == null) continue;
    n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return n;
}
