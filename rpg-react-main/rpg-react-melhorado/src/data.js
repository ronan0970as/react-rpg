import { supabase } from './supabase';

export function getFichaId() {
  return localStorage.getItem('rpg_ficha_ativa') || null;
}

function k(chave) {
  const id = getFichaId();
  return id ? `${id}_${chave}` : `__sem_ficha__${chave}`;
}

export async function salvarNuvem(tipo, valor) {
  const fichaId = getFichaId();
  if (!fichaId) return;
  const { error } = await supabase
    .from('fichas_dados')
    .upsert({ ficha_id: fichaId, tipo, valor: JSON.stringify(valor) }, { onConflict: 'ficha_id,tipo' });
  if (error) console.error(`Erro ao salvar ${tipo}:`, error.message);
}

export async function carregarDaNuvem(tipo) {
  const fichaId = getFichaId();
  if (!fichaId) return null;
  const { data, error } = await supabase
    .from('fichas_dados')
    .select('valor')
    .eq('ficha_id', fichaId)
    .eq('tipo', tipo)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  try { return JSON.parse(data.valor); } catch (e) { return null; }
}

export async function carregarStatus() {
  let dados = await carregarDaNuvem('status');
  if (!dados) {
    try { dados = JSON.parse(localStorage.getItem(k('rpg_dados'))); } catch (e) {}
  }
  return dados || null;
}

export async function salvarStatus(dados) {
  localStorage.setItem(k('rpg_dados'), JSON.stringify(dados));
  await salvarNuvem('status', dados);
}

export async function carregarTalentos() {
  let talentos = await carregarDaNuvem('talentos');
  if (!talentos) talentos = JSON.parse(localStorage.getItem(k('rpg_talentos')) || '[]');
  return Array.isArray(talentos) ? talentos : [];
}

export async function salvarTalentos(talentos) {
  localStorage.setItem(k('rpg_talentos'), JSON.stringify(talentos));
  await salvarNuvem('talentos', talentos);
}

export async function carregarInventario() {
  let inv = await carregarDaNuvem('inventario');
  if (!inv) inv = JSON.parse(localStorage.getItem(k('rpg_inventario')) || '[]');
  return Array.isArray(inv) ? inv : [];
}

export async function salvarInventario(inventario) {
  localStorage.setItem(k('rpg_inventario'), JSON.stringify(inventario));
  await salvarNuvem('inventario', inventario);
}

export function calcularAtributos(dados, talentos) {
  const { calcularTodosBuffs, parsearBuffsDinamicos, FORMULAS_STATUS } = require('./buffs');

  const bases = {
    forca: (parseInt(dados.forcaBase) || 0) + parseBonus(dados.forcaBonus, parseInt(dados.forcaBase) || 0),
    velocidade: (parseInt(dados.velBase) || 0) + parseBonus(dados.velBonus, parseInt(dados.velBase) || 0),
    inteligencia: (parseInt(dados.intBase) || 0) + parseBonus(dados.intBonus, parseInt(dados.intBase) || 0),
    defesa: (parseInt(dados.defBase) || 0) + parseBonus(dados.defBonus, parseInt(dados.defBase) || 0),
    pontaria: (parseInt(dados.pontBase) || 0) + parseBonus(dados.pontBonus, parseInt(dados.pontBase) || 0),
    carisma: (parseInt(dados.carBase) || 0) + parseBonus(dados.carBonus, parseInt(dados.carBase) || 0),
    furtividade: (parseInt(dados.furtBase) || 0) + parseBonus(dados.furtBonus, parseInt(dados.furtBase) || 0),
  };

  const nivel = parseInt(dados.nivel) || 0;
  const sanidade = parseInt(dados.sanAtual) || 0;
  const statusInicial = { manaMax: bases.inteligencia * 10, vidaMax: 50 + bases.defesa * 50, nivel, sanidade };

  const totais = calcularTodosBuffs(talentos || [], bases, statusInicial);

  if (dados.habilidades?.trim()) {
    const ATTR_KEYS = ['forca','velocidade','inteligencia','defesa','pontaria','carisma','furtividade'];
    const ctxAttr = {};
    ATTR_KEYS.forEach(k2 => { ctxAttr[k2] = (bases[k2] || 0) + (totais[k2] || 0); });
    const ctxStatus = {
      manaMax: (ctxAttr.inteligencia * 10) + (totais.manaMax || 0),
      vidaMax: 50 + (ctxAttr.defesa * 50) + (totais.vidaMax || 0),
      nivel, sanidade, ...ctxAttr
    };
    const habBuffs = parsearBuffsDinamicos(dados.habilidades, { bases: ctxAttr, statusLocal: ctxStatus });
    Object.keys(totais).forEach(k2 => { if (habBuffs[k2]) totais[k2] += habBuffs[k2]; });
  }

  const defTotal = (bases.defesa || 0) + (totais.defesa || 0);
  const intTotal = (bases.inteligencia || 0) + (totais.inteligencia || 0);
  const vidaMax = Math.max(1, 50 + defTotal * 50 + (totais.vidaMax || 0));
  const manaMax = Math.max(1, intTotal * 10 + (totais.manaMax || 0));

  return { bases, totais, vidaMax, manaMax };
}

function parseBonus(txt, baseVal) {
  if (!txt || txt === '0') return 0;
  const s = String(txt).trim();
  if (s.includes('%')) return Math.round(baseVal * (parseFloat(s.replace('%', '')) / 100));
  return parseInt(s) || 0;
}
