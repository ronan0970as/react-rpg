/**
 * useBuffs — Hook puro para cálculo de atributos com buffs.
 *
 * PROBLEMA CORRIGIDO:
 *   O cálculo anterior era feito diretamente no render ou em useEffect,
 *   causando loops (setState → re-render → recalcula → setState...).
 *
 * SOLUÇÃO:
 *   - useMemo com deps granulares (só os campos que afetam o cálculo)
 *   - Nenhuma chamada a setState dentro do hook
 *   - Função de cálculo pura: mesma entrada → mesma saída, sem efeitos
 */

import { useMemo } from 'react';
import { calcularAtributos } from '../data';

/** Dependências granulares para evitar recalcular a cada keystroke */
function extrairDeps(dados) {
  if (!dados) return [];
  return [
    // Bases
    dados.forcaBase, dados.velBase, dados.intBase,
    dados.defBase,   dados.pontBase, dados.carBase, dados.furtBase,
    // Bônus (podem ser percentuais ou absolutos)
    dados.forcaBonus, dados.velBonus, dados.intBonus,
    dados.defBonus,   dados.pontBonus, dados.carBonus, dados.furtBonus,
    // Campos que influenciam a fórmula de vida/mana
    dados.nivel,
    dados.habilidades ?? '',
    // Pontos gastos em atributos (snapshot serializado para comparação estável)
    JSON.stringify(dados.pontosDistribuicao ?? {}),
  ];
}

const EMPTY_RESULT = {
  bases:   { forca: 0, velocidade: 0, inteligencia: 0, defesa: 0, pontaria: 0, carisma: 0, furtividade: 0 },
  totais:  {},
  vidaMax: 50,
  manaMax: 0,
};

/**
 * @param {object|null} dados   - dados do status do personagem
 * @param {Array}       talentos - lista de talentos (com .ativo, .buffs, .desc)
 * @returns {{ bases, totais, vidaMax, manaMax }}
 */
export function useBuffs(dados, talentos) {
  // Snapshot serializado dos talentos que importam para o cálculo
  // (apenas os campos relevantes, não a referência do array inteiro)
  const talentosSnap = useMemo(() => {
    if (!Array.isArray(talentos) || talentos.length === 0) return '[]';
    return JSON.stringify(
      talentos.map(t => ({
        id:    t.id,
        ativo: t.ativo,
        desc:  t.desc  ?? '',
        buffs: t.buffs ?? {},
      }))
    );
  }, [talentos]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    if (!dados) return EMPTY_RESULT;
    try {
      return calcularAtributos(dados, JSON.parse(talentosSnap));
    } catch (err) {
      console.error('[useBuffs] Erro no cálculo de atributos:', err);
      return EMPTY_RESULT;
    }
  // deps granulares = campos que o cálculo realmente usa
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...extrairDeps(dados), talentosSnap]);
}
