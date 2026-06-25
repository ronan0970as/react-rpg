/**
 * usePermissoes — Controle de acesso baseado em papel (RBAC).
 *
 * Centraliza TODAS as regras de permissão para que nenhum componente
 * precise repetir lógica de "isMestre && fichaId === ..."
 *
 * Regras de negócio:
 *   - Sem mesa ativa → jogador edita tudo (modo rascunho)
 *   - Com mesa ativa → base bloqueada para jogador; mestre edita tudo
 *   - Mestre vendo ficha alheia → pode editar base + adicionar pontos
 *   - Jogador → só gasta pontos disponíveis, não adiciona
 */

import { useMemo } from 'react';
import { useAuth } from '../AuthContext';

export function usePermissoes(fichaIdAlvo = null) {
  const { isMestre, sessaoCache, mesaAtiva } = useAuth();

  return useMemo(() => {
    const fichaAtiva   = localStorage.getItem('rpg_ficha_ativa');
    const ehDonoDaFicha = !fichaIdAlvo || fichaIdAlvo === fichaAtiva;
    const mesaAtivada  = !!mesaAtiva?.id;

    return {
      /** Pode alterar valores base de atributos (forcaBase, etc.) */
      podeEditarBase: !mesaAtivada || isMestre,

      /** Pode gastar pontos de status (incrementar atributo via pontos) */
      podeGastarPontos: !isMestre && ehDonoDaFicha,

      /** Pode injetar pontos no pool de status de um jogador */
      podeAdicionarPontos: isMestre,

      /** Pode acessar a página de personalização de fichas */
      podeCustomizarFicha: isMestre,

      /** Pode ver fichas de outros jogadores */
      podeVerFichasAlheias: isMestre,

      /** Pode criar/editar mesas */
      podeGerenciarMesa: isMestre,

      /** Pode convidar/remover jogadores de uma mesa */
      podeGerenciarJogadores: isMestre,

      /** Pode adicionar opções de Deus / Origem / etc. */
      podeGerenciarOpcoes: isMestre,

      /** Pode ver histórico completo de rolagens e edições */
      podeVerHistoricoCompleto: isMestre,

      /** Pode editar campos informativos da ficha (nome do personagem, etc.) */
      podeEditarInfoBasica: ehDonoDaFicha || isMestre,

      /** Pode fazer upload de foto */
      podeFazerUploadFoto: ehDonoDaFicha || isMestre,

      /** Está em modo de visualização de ficha alheia */
      estaSendoMestre: isMestre && !ehDonoDaFicha,

      // Helpers de identidade
      isMestre,
      mesaAtivada,
      ehDonoDaFicha,
      userId: sessaoCache?.id,
    };
  }, [isMestre, mesaAtiva, sessaoCache, fichaIdAlvo]);
}
