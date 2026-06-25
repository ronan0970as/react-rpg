/**
 * MesaContext — Fonte única de verdade para tudo relacionado à mesa ativa.
 *
 * Evita prop-drilling e múltiplas chamadas ao Supabase espalhadas pelos
 * componentes. Qualquer página que precise de dados da mesa usa `useMesa()`.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import {
  carregarOpcoesMesa,
  carregarMembrosDA,
  carregarPontosStatus,
} from '../data';

const MesaContext = createContext(null);

// ─── Helpers ─────────────────────────────────────────────────────────
async function fetchPersonalizacao(mesaId) {
  if (!mesaId) return null;
  const { data, error } = await supabase
    .from('personalizacao_mesa')
    .select('*')
    .eq('mesa_id', mesaId)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function fetchConvitesPendentes(userId) {
  if (!userId) return [];
  const { data } = await supabase
    .from('convites_mesa')
    .select('*, mesa:mesas(id, nome, mestre_id, icone)')
    .eq('user_id', userId)
    .eq('status', 'pendente')
    .gt('expires_at', new Date().toISOString());
  return data || [];
}

// ─── Provider ────────────────────────────────────────────────────────
export function MesaProvider({ children }) {
  const { mesaAtiva, sessaoCache } = useAuth();
  const mesaId = mesaAtiva?.id;
  const userId = sessaoCache?.id;

  const [deuses,         setDeuses]         = useState([]);
  const [origens,        setOrigens]        = useState([]);
  const [membros,        setMembros]        = useState([]);
  const [personalizacao, setPersonalizacao] = useState(null);
  const [convites,       setConvites]       = useState([]);  // pendentes para o jogador
  const [pontosJogador,  setPontosJogador]  = useState({ pontos_totais: 0, pontos_gastos: 0 });
  const [loading,        setLoading]        = useState(false);
  const abortRef = useRef(null);

  // ─── Carga principal ────────────────────────────────────────────
  const recarregarMesa = useCallback(async () => {
    // Cancela carga anterior se ainda estiver em andamento
    if (abortRef.current) abortRef.current = false;
    const token = true;
    abortRef.current = token;

    if (!mesaId) {
      setDeuses([]); setOrigens([]); setMembros([]);
      setPersonalizacao(null); setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [d, o, m, p] = await Promise.all([
        carregarOpcoesMesa(mesaId, 'deus'),
        carregarOpcoesMesa(mesaId, 'origem'),
        carregarMembrosDA(mesaId),
        fetchPersonalizacao(mesaId),
      ]);
      if (abortRef.current !== token) return; // descarta resultado se cancelado
      setDeuses(d);
      setOrigens(o);
      setMembros(m);
      setPersonalizacao(p);
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }, [mesaId]);

  // ─── Convites do jogador ─────────────────────────────────────────
  const recarregarConvites = useCallback(async () => {
    if (!userId) return;
    const c = await fetchConvitesPendentes(userId);
    setConvites(c);
  }, [userId]);

  // ─── Pontos do jogador na mesa ────────────────────────────────────
  const recarregarPontos = useCallback(async (fichaId) => {
    if (!fichaId || !mesaId) return;
    const p = await carregarPontosStatus(fichaId, mesaId);
    setPontosJogador(p);
  }, [mesaId]);

  useEffect(() => { recarregarMesa(); },    [recarregarMesa]);
  useEffect(() => { recarregarConvites(); }, [recarregarConvites]);

  // ─── Salvar personalização ───────────────────────────────────────
  const salvarPersonalizacao = useCallback(async (config) => {
    if (!mesaId) return;
    const payload = { mesa_id: mesaId, ...config, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('personalizacao_mesa')
      .upsert(payload, { onConflict: 'mesa_id' });
    if (error) throw error;
    setPersonalizacao(prev => ({ ...prev, ...config }));
  }, [mesaId]);

  // ─── Responder convite ──────────────────────────────────────────
  const responderConvite = useCallback(async (conviteId, aceitar) => {
    const status = aceitar ? 'aceito' : 'recusado';
    const { error } = await supabase
      .from('convites_mesa')
      .update({ status })
      .eq('id', conviteId);
    if (error) throw error;
    setConvites(prev => prev.filter(c => c.id !== conviteId));
    if (aceitar) recarregarMesa();
  }, [recarregarMesa]);

  // ─── Campos visíveis com fallback ───────────────────────────────
  const camposVisiveis = personalizacao?.campos_visiveis ?? {
    deus: true, origem: true, raca: true, classe: true,
    sanidade: true, carisma: true, furtividade: true,
    pontaria: true, habilidades: true,
  };

  const camposLabels = personalizacao?.campos_labels ?? {};
  const camposCustom = personalizacao?.campos_custom  ?? [];
  const temaCor      = personalizacao?.tema_cor       ?? 'gold';
  const fichaLocked  = personalizacao?.ficha_locked   ?? false;

  return (
    <MesaContext.Provider value={{
      mesaId, loading,
      // Dados
      deuses, origens, membros,
      personalizacao, camposVisiveis, camposLabels, camposCustom, temaCor, fichaLocked,
      convites, pontosJogador,
      // Ações
      recarregarMesa, recarregarConvites, recarregarPontos,
      salvarPersonalizacao, responderConvite,
      // Setters diretos (para atualizações optimistas)
      setDeuses, setOrigens, setMembros,
    }}>
      {children}
    </MesaContext.Provider>
  );
}

/** Hook de consumo */
export function useMesa() {
  const ctx = useContext(MesaContext);
  if (!ctx) throw new Error('useMesa deve ser usado dentro de <MesaProvider>');
  return ctx;
}
