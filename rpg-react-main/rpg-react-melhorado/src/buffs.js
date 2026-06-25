// buffs.js — Parser de Buffs Dinâmicos (portado para ES module)

export const FORMULAS_STATUS = {
  vidaMax: (defesa) => 50 + defesa * 50,
  manaMax: (inteligencia) => inteligencia * 10,
  sanidade: () => 100
};

function _norm(txt) {
  const s = String(txt).toLowerCase();
  try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { return s; }
}

const BUFF_ALIAS = {
  forca: ['forca', 'dano fisico', 'ataque fisico', 'dano', 'str'],
  velocidade: ['velocidade', 'agilidade', 'spd'],
  inteligencia: ['inteligencia', 'intel', 'magia', 'poder magico', 'int'],
  defesa: ['defesa', 'armadura', 'resistencia', 'def'],
  pontaria: ['pontaria', 'precisao', 'mira', 'pont'],
  carisma: ['carisma', 'persuasao', 'lideranca', 'car'],
  furtividade: ['furtividade', 'furtivo', 'stealth', 'sombra', 'furt']
};

const STATUS_DEST_ALIAS = {
  vidaMax: ['vida maxima', 'vida max', 'hp maximo', 'hp max', 'vida total'],
  manaMax: ['mana maxima', 'mana max', 'mp maximo', 'mp max', 'mana total'],
  sanidadeMax: ['sanidade maxima', 'sanidade max', 'san max']
};

const FONTE_ALIAS = {
  manaMax: ['mana maxima', 'mana max', 'mana total', 'mana', 'mp'],
  vidaMax: ['vida maxima', 'vida max', 'vida total', 'vida', 'hp'],
  sanidade: ['sanidade', 'san'],
  nivel: ['nivel', 'level', 'lv', 'lvl'],
  forca: ['forca', 'str'],
  velocidade: ['velocidade', 'agilidade', 'spd'],
  inteligencia: ['inteligencia', 'intel', 'magia', 'int'],
  defesa: ['defesa', 'armadura', 'resistencia', 'def'],
  pontaria: ['pontaria', 'precisao', 'mira', 'pont'],
  carisma: ['carisma', 'persuasao', 'lideranca', 'car'],
  furtividade: ['furtividade', 'furtivo', 'stealth', 'furt']
};

function _buildMatcher(aliases) {
  return [...aliases].sort((a, b) => b.length - a.length).map(a => ({
    str: a,
    re: new RegExp('(?:^|\\s)' + a.replace(/\s+/g, '\\s+') + '(?:\\s|$)')
  }));
}

const _matchersAtrib = Object.fromEntries(Object.entries(BUFF_ALIAS).map(([k, v]) => [k, _buildMatcher(v)]));
const _matchersDest = Object.fromEntries(Object.entries(STATUS_DEST_ALIAS).map(([k, v]) => [k, _buildMatcher(v)]));
const _matchersFonte = Object.entries(FONTE_ALIAS)
  .sort((a, b) => Math.max(...b[1].map(x => x.length)) - Math.max(...a[1].map(x => x.length)))
  .map(([k, v]) => [k, _buildMatcher(v)]);

function resolverAtributo(txt) {
  if (!txt) return null;
  const t = _norm(txt).replace(/[).,!:;]/g, '').trim();
  for (const [key, matchers] of Object.entries(_matchersAtrib)) {
    if (matchers.some(({ re, str }) => re.test(t) || t === str)) return key;
  }
  return null;
}

function resolverStatusDestino(txt) {
  if (!txt) return null;
  const t = _norm(txt).replace(/[).,!:;]/g, '').trim();
  for (const [key, matchers] of Object.entries(_matchersDest)) {
    if (matchers.some(({ str }) => t.includes(str))) return key;
  }
  return null;
}

function resolverFonte(txt) {
  if (!txt) return null;
  const t = _norm(txt).replace(/[).,!:;]/g, '').trim();
  for (const [key, matchers] of _matchersFonte) {
    if (matchers.some(({ re, str }) => re.test(t) || t === str || t.includes(str))) return key;
  }
  return null;
}

export function parsearBuffsDinamicos(texto, opts = {}) {
  const bases = opts.bases || {};
  const statusLocal = opts.statusLocal || {};

  const buffs = { forca: 0, velocidade: 0, inteligencia: 0, defesa: 0, pontaria: 0, carisma: 0, furtividade: 0, vidaMax: 0, manaMax: 0, sanidadeMax: 0 };

  function _getFonte(key) {
    if (key === 'nivel') return Number(statusLocal.nivel || bases.nivel || 0);
    if (key === 'manaMax') return statusLocal.manaMax ?? FORMULAS_STATUS.manaMax(bases.inteligencia || 0);
    if (key === 'vidaMax') return statusLocal.vidaMax ?? FORMULAS_STATUS.vidaMax(bases.defesa || 0);
    if (key === 'sanidade') return statusLocal.sanidade || 0;
    return Number(bases[key] ?? statusLocal[key] ?? 0);
  }

  function add(key, val) {
    if (!key || isNaN(val) || val === 0) return;
    if (key in buffs) buffs[key] += val;
  }

  function addTodos(val) {
    Object.keys(BUFF_ALIAS).forEach(k => add(k, val));
  }

  const norm = _norm(texto);
  const partes = norm.split(/[,;\n]|\be\b|\bou\b/).map(s => s.trim()).filter(Boolean);

  for (const parte of partes) {
    const sinalMatch = parte.match(/^([+-]?)\s*(\d[\s\S]*)$/);
    if (!sinalMatch) continue;
    const sinal = sinalMatch[1] === '-' ? -1 : 1;
    const corpo = sinalMatch[2].trim();

    if (/^(\d+(?:[.,]\d+)?)\s*(?:em\s+)?(?:tudo|todos)/.test(corpo)) {
      addTodos(parseFloat(corpo.replace(',', '.')) * sinal);
      continue;
    }

    const mAC = /^(\d+(?:[.,]\d+)?)\s*(?:de\s+|em\s+)?([a-z ]*?)\s*a cada\s+(\d+(?:[.,]\d+)?)\s*(?:d[eoa]s?\s+)?([a-z ]+)/.exec(corpo);
    if (mAC) {
      const bonusPorX = parseFloat(mAC[1].replace(',', '.')) * sinal;
      const destTxt = mAC[2].trim();
      const divisor = parseFloat(mAC[3].replace(',', '.'));
      const fonteTxt = mAC[4].trim().replace(/^(?:de|do|da|dos|das)\s+/, '');
      const fonteKey = resolverFonte(fonteTxt);
      if (divisor > 0 && fonteKey) {
        const bonus = Math.floor(_getFonte(fonteKey) / divisor) * bonusPorX;
        if (!destTxt || /^(?:tudo|todos)$/.test(destTxt)) addTodos(bonus);
        else { const sk = resolverStatusDestino(destTxt); if (sk) add(sk, bonus); else add(resolverAtributo(destTxt), bonus); }
      }
      continue;
    }

    const mPct = /^(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+|em\s+)?([a-z ]{2,35})/.exec(corpo);
    if (mPct) {
      const pct = parseFloat(mPct[1].replace(',', '.')) * sinal;
      const destTxt = mPct[2].trim();
      const sk = resolverStatusDestino(destTxt);
      if (sk) add(sk, Math.round((pct / 100) * _getFonte(sk)));
      else { const ak = resolverAtributo(destTxt); if (ak) add(ak, Math.round((pct / 100) * Number(bases[ak] ?? statusLocal[ak] ?? 0))); }
      continue;
    }

    const mNiv = /^(\d+(?:[.,]\d+)?)\s*(?:de\s+|em\s+)?([a-z ]{2,35}?)\s+por\s+n[ií]vel/.exec(corpo);
    if (mNiv) {
      const bonusNiv = parseFloat(mNiv[1].replace(',', '.')) * sinal;
      const nivel = _getFonte('nivel');
      const destTxt = mNiv[2].trim();
      const sk = resolverStatusDestino(destTxt);
      if (sk) add(sk, bonusNiv * nivel); else add(resolverAtributo(destTxt), bonusNiv * nivel);
      continue;
    }

    const mS = /^(\d+(?:[.,]\d+)?)\s*(?:de\s+|em\s+)?([a-z][a-z ]{0,30})/.exec(corpo);
    if (mS) {
      const val = parseFloat(mS[1].replace(',', '.')) * sinal;
      const destTxt = mS[2].trim();
      if (/^(?:tudo|todos)$/.test(destTxt)) { addTodos(val); continue; }
      const sk = resolverStatusDestino(destTxt);
      const ak = sk ? null : resolverAtributo(destTxt);
      if (sk) add(sk, val); else add(ak, val);
    }
  }

  Object.keys(buffs).forEach(k => { if (buffs[k] === 0) delete buffs[k]; });
  return buffs;
}

export function calcularTodosBuffs(talentos, basesIniciais, statusInicial) {
  const acum = { forca: 0, velocidade: 0, inteligencia: 0, defesa: 0, pontaria: 0, carisma: 0, furtividade: 0, vidaMax: 0, manaMax: 0, sanidadeMax: 0 };
  const ATTR_KEYS = Object.keys(BUFF_ALIAS);

  for (const talento of talentos) {
    if (!talento.ativo) continue;
    ATTR_KEYS.forEach(k => {
      const valStr = talento.buffs?.[k] || '';
      if (!valStr) return;
      const baseVal = basesIniciais[k] || 0;
      let delta = 0;
      if (valStr.includes('%')) { const pct = parseFloat(valStr.replace('%', '')); if (!isNaN(pct)) delta = Math.round((pct / 100) * baseVal); }
      else { const num = parseInt(valStr); if (!isNaN(num)) delta = num; }
      if (delta !== 0) acum[k] += delta;
    });

    const ctxAttr = {};
    ATTR_KEYS.forEach(k => { ctxAttr[k] = (basesIniciais[k] || 0) + (acum[k] || 0); });
    const ctxStatus = {
      manaMax: FORMULAS_STATUS.manaMax(ctxAttr.inteligencia) + (acum.manaMax || 0),
      vidaMax: FORMULAS_STATUS.vidaMax(ctxAttr.defesa) + (acum.vidaMax || 0),
      sanidade: statusInicial.sanidade || 0,
      nivel: statusInicial.nivel || 0,
      ...ctxAttr
    };

    if (talento.desc) {
      const din = parsearBuffsDinamicos(talento.desc, { bases: ctxAttr, statusLocal: ctxStatus });
      Object.keys(acum).forEach(key => { if (din[key]) acum[key] += din[key]; });
    }
  }

  return acum;
}
