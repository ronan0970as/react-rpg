/**
 * PersonalizacaoFicha — Painel do Mestre para customizar o layout da ficha.
 *
 * Features:
 *  - Toggle de visibilidade de cada campo
 *  - Renomear labels
 *  - Gerenciar Deuses e Origens da mesa
 *  - Campos extras personalizados
 *  - Seleção de tema de cor
 *  - Preview ao vivo sincronizado
 *  - Lock de ficha (congela edição dos jogadores)
 */

import { useState, useCallback } from 'react';
import { Nav, showToast } from '../components';
import { useMesa } from '../contexts/MesaContext';
import { salvarOpcaoMesa, deletarOpcaoMesa } from '../data';

// ─── Constantes ──────────────────────────────────────────────────────
const CAMPOS_TOGGLE = [
  { key: 'classe',       label: 'Classe',       icon: '⚔️' },
  { key: 'raca',         label: 'Raça',         icon: '🧬' },
  { key: 'deus',         label: 'Deus',         icon: '✦' },
  { key: 'origem',       label: 'Origem',       icon: '🌍' },
  { key: 'sanidade',     label: 'Sanidade',     icon: '🌀' },
  { key: 'carisma',      label: 'Carisma',      icon: '💬' },
  { key: 'furtividade',  label: 'Furtividade',  icon: '🌑' },
  { key: 'pontaria',     label: 'Pontaria',     icon: '🎯' },
  { key: 'habilidades',  label: 'Habilidades',  icon: '📖' },
];

const TEMAS = [
  { key: 'gold',   label: 'Ouro',    cor: '#d4a943', bg: '#1e1e32' },
  { key: 'purple', label: 'Arcano',  cor: '#a78bfa', bg: '#1a1030' },
  { key: 'red',    label: 'Infernal',cor: '#e05c3a', bg: '#200a08' },
  { key: 'green',  label: 'Natural', cor: '#4CAF50', bg: '#0a1e10' },
  { key: 'blue',   label: 'Celeste', cor: '#2590c8', bg: '#081820' },
  { key: 'dark',   label: 'Sombrio', cor: '#8899aa', bg: '#0a0a10' },
];

const TIPOS_OPCAO = ['deus', 'origem', 'classe', 'raca'];

// ─── Preview Component ────────────────────────────────────────────────
function FichaPreview({ campos, labels, tema, camposCustom }) {
  const { cor, bg } = TEMAS.find(t => t.key === tema) || TEMAS[0];

  return (
    <div style={{
      background: bg, border: `1px solid ${cor}44`,
      borderRadius: 10, padding: 16, overflow: 'auto',
      boxShadow: `0 0 20px ${cor}22`,
    }}>
      {/* Cabeçalho */}
      <div style={{ borderBottom: `1px solid ${cor}44`, paddingBottom: 10, marginBottom: 12 }}>
        <div style={{ fontFamily: 'Georgia,serif', color: cor, fontSize: 16, fontWeight: 700 }}>
          Nome do Personagem
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {campos.classe     && <Tag cor={cor}>{labels.classe    || 'Classe'}: Guerreiro</Tag>}
          {campos.raca       && <Tag cor={cor}>{labels.raca      || 'Raça'}: Humano</Tag>}
          <Tag cor={cor}>Nv 8</Tag>
        </div>
      </div>

      {/* Vitais */}
      <div style={{ marginBottom: 12 }}>
        <PreviewBar label="❤️ HP" pct={70} cor="#e05c3a" />
        <PreviewBar label="💧 MP" pct={45} cor="#2590c8" />
        {campos.sanidade && <PreviewBar label="🌀 San" pct={85} cor="#8050b8" />}
      </div>

      {/* Atributos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px,1fr))', gap: 6, marginBottom: 12 }}>
        {[
          { label: labels.forca      || 'FOR', val: 14 },
          { label: labels.velocidade || 'VEL', val: 11 },
          { label: labels.inteligencia || 'INT', val: 9 },
          { label: labels.defesa     || 'DEF', val: 13 },
          ...(campos.pontaria    ? [{ label: labels.pontaria    || 'PONT', val: 10 }] : []),
          ...(campos.carisma     ? [{ label: labels.carisma     || 'CAR',  val: 12 }] : []),
          ...(campos.furtividade ? [{ label: labels.furtividade || 'FURT', val: 7  }] : []),
        ].map(a => (
          <AttrChip key={a.label} label={a.label} val={a.val} cor={cor} />
        ))}
      </div>

      {/* Deus / Origem */}
      {(campos.deus || campos.origem) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {campos.deus   && <Tag cor={cor}>✦ {labels.deus   || 'Deus'}: Mitra</Tag>}
          {campos.origem && <Tag cor={cor}>🌍 {labels.origem || 'Origem'}: Herói</Tag>}
        </div>
      )}

      {/* Campos customizados */}
      {camposCustom.map((c, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: `${cor}99`, fontFamily: 'Georgia,serif', letterSpacing: '0.8px' }}>
            {c.label?.toUpperCase() || 'CAMPO'}
          </div>
          <div style={{ fontSize: 12, color: '#c4c4d8', padding: '4px 0', borderBottom: `1px solid ${cor}22` }}>
            {c.placeholder || '—'}
          </div>
        </div>
      ))}

      {/* Habilidades */}
      {campos.habilidades && (
        <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 5, border: `1px solid ${cor}22` }}>
          <div style={{ fontSize: 10, color: `${cor}88`, marginBottom: 4 }}>
            {(labels.habilidades || 'HABILIDADES').toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: '#7a7060', fontStyle: 'italic' }}>
            Texto de habilidades e passivas do personagem...
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ cor, children }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${cor}15`, border: `1px solid ${cor}30`, color: cor, fontFamily: 'Georgia,serif' }}>
      {children}
    </span>
  );
}

function PreviewBar({ label, pct, cor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 10, minWidth: 48, color: '#7a7060' }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${cor}88,${cor})`, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10, color: cor, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function AttrChip({ label, val, cor }) {
  return (
    <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${cor}22`, borderRadius: 5, padding: '6px 4px' }}>
      <div style={{ fontSize: 8, color: '#7a7060', letterSpacing: '0.8px' }}>{label}</div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: cor }}>{val}</div>
    </div>
  );
}

// ─── Formulário de Opção (Deus/Origem) ───────────────────────────────
function OpcaoForm({ tipo, onSalvar, initial = null, onCancelar }) {
  const [form, setForm] = useState(
    initial ?? { nome: '', descricao: '', bonus: '', icone: '' }
  );
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8, marginBottom: 8 }}>
        <input placeholder="Nome *" value={form.nome}
          onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
        <input placeholder="🔮" value={form.icone} maxLength={4}
          onChange={e => setForm(p => ({ ...p, icone: e.target.value }))}
          style={{ textAlign: 'center', fontSize: 18 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <input placeholder="Descrição" value={form.descricao}
          onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
        <input placeholder="Bônus (ex: +2 Força)" value={form.bonus}
          onChange={e => setForm(p => ({ ...p, bonus: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ fontSize: 10 }}
          onClick={() => { if (form.nome.trim()) { onSalvar({ ...form, tipo }); }}}>
          {initial ? '💾 Salvar' : '+ Adicionar'}
        </button>
        {initial && <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={onCancelar}>Cancelar</button>}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
export default function PersonalizacaoFicha() {
  const {
    mesaId, deuses, origens, personalizacao,
    camposVisiveis, camposLabels, temaCor, camposCustom, fichaLocked,
    recarregarMesa, salvarPersonalizacao, setDeuses, setOrigens,
  } = useMesa();

  const [preview,    setPreview]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [tipoOpcao,  setTipoOpcao]  = useState('deus');
  const [editOpcao,  setEditOpcao]  = useState(null);

  // Estado local de customização (aplicado ao salvar)
  const [localCampos, setLocalCampos]  = useState(() => ({ ...camposVisiveis }));
  const [localLabels, setLocalLabels]  = useState(() => ({ ...camposLabels }));
  const [localTema,   setLocalTema]    = useState(temaCor);
  const [localCustom, setLocalCustom]  = useState(() => [...(camposCustom || [])]);
  const [localLocked, setLocalLocked]  = useState(fichaLocked ?? false);

  // ── Gerenciar campos toggle ───────────────────────────────────────
  function toggleCampo(key) {
    setLocalCampos(p => ({ ...p, [key]: !p[key] }));
  }
  function setLabel(key, val) {
    setLocalLabels(p => ({ ...p, [key]: val }));
  }

  // ── Campos extras ─────────────────────────────────────────────────
  function addCampoCustom() {
    setLocalCustom(p => [...p, { label: '', tipo: 'texto', placeholder: '', obrigatorio: false }]);
  }
  function updCampoCustom(i, field, val) {
    setLocalCustom(p => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }
  function remCampoCustom(i) {
    setLocalCustom(p => p.filter((_, idx) => idx !== i));
  }

  // ── Opções (Deuses/Origens) ───────────────────────────────────────
  async function handleSalvarOpcao(opcao) {
    try {
      await salvarOpcaoMesa(mesaId, opcao);
      await recarregarMesa();
      showToast('✓ Opção salva!');
      setEditOpcao(null);
    } catch (err) { showToast(err.message, '#e74c3c'); }
  }

  async function handleDeletarOpcao(id, tipo) {
    if (!confirm('Remover esta opção?')) return;
    try {
      await deletarOpcaoMesa(id);
      if (tipo === 'deus')   setDeuses(p => p.filter(d => d.id !== id));
      else                   setOrigens(p => p.filter(o => o.id !== id));
      showToast('Removido.');
    } catch (err) { showToast(err.message, '#e74c3c'); }
  }

  // ── Salvar tudo ───────────────────────────────────────────────────
  async function handleSalvar() {
    if (!mesaId) return showToast('Selecione uma mesa primeiro.', '#e74c3c');
    setSaving(true);
    try {
      await salvarPersonalizacao({
        campos_visiveis: localCampos,
        campos_labels:   localLabels,
        campos_custom:   localCustom,
        tema_cor:        localTema,
        ficha_locked:    localLocked,
      });
      showToast('✨ Personalização salva e aplicada para a mesa!');
    } catch (err) { showToast(err.message, '#e74c3c'); }
    finally { setSaving(false); }
  }

  const opcaoAtual = tipoOpcao === 'deus' ? deuses : origens;

  if (!mesaId) {
    return (
      <>
        <Nav />
        <div className="rpg-window">
          <div className="painel-empty">
            <div style={{ fontSize: 48, opacity: 0.2 }}>🎨</div>
            <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink-dim)', fontSize: 13, letterSpacing: 1, marginTop: 12 }}>
              Selecione uma mesa para personalizar fichas
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="rpg-window">
        <div className="pers-header">
          <h2>🎨 Personalização de Fichas</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="pers-toggle-label">
              <input type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)} />
              Preview ao vivo
            </label>
            <button className="save-btn" style={{ width: 'auto', padding: '10px 20px' }}
              onClick={handleSalvar} disabled={saving}>
              {saving ? '⏳...' : '💾 Aplicar para a Mesa'}
            </button>
          </div>
        </div>

        <div className="pers-layout">
          {/* ══ PAINEL ESQUERDO: Configurações ══ */}
          <div className="pers-config">

            {/* ── 1. Tema de cor ── */}
            <div className="section">
              <h2>🎨 Tema de Cor</h2>
              <div className="pers-temas-grid">
                {TEMAS.map(t => (
                  <button key={t.key} type="button"
                    className={`pers-tema-btn${localTema === t.key ? ' selected' : ''}`}
                    style={{ borderColor: localTema === t.key ? t.cor : 'transparent',
                      boxShadow: localTema === t.key ? `0 0 10px ${t.cor}44` : 'none' }}
                    onClick={() => setLocalTema(t.key)}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: t.cor, marginRight: 6, verticalAlign: 'middle' }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 2. Campos visíveis ── */}
            <div className="section">
              <h2>👁 Visibilidade dos Campos</h2>
              <div className="pers-campos-list">
                {CAMPOS_TOGGLE.map(({ key, label, icon }) => (
                  <div key={key} className="pers-campo-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Label customizável */}
                      {localCampos[key] && (
                        <input type="text" value={localLabels[key] || ''}
                          onChange={e => setLabel(key, e.target.value)}
                          placeholder={label}
                          style={{ width: 100, fontSize: 11, padding: '3px 6px' }} />
                      )}
                      {/* Toggle */}
                      <button type="button"
                        className={`pers-campo-toggle${localCampos[key] ? ' on' : ''}`}
                        onClick={() => toggleCampo(key)}>
                        {localCampos[key] ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. Deuses / Origens ── */}
            <div className="section">
              <h2>✦ Opções de Mesa</h2>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {TIPOS_OPCAO.map(t => (
                  <button key={t} type="button"
                    className={`inv-cat-btn${tipoOpcao === t ? ' ativo' : ''}`}
                    onClick={() => setTipoOpcao(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Form novo */}
              {editOpcao === null && (
                <OpcaoForm tipo={tipoOpcao} onSalvar={handleSalvarOpcao} />
              )}

              {/* Lista existente */}
              {opcaoAtual.map(op => (
                <div key={op.id} className="opcao-item">
                  <div className="opcao-icon">{op.icone || '•'}</div>
                  <div className="opcao-info">
                    <div className="opcao-nome">{op.nome}</div>
                    {op.descricao && <div className="opcao-desc">{op.descricao}</div>}
                    {op.bonus && <div className="opcao-bonus">🎲 {op.bonus}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 10 }}
                      onClick={() => setEditOpcao(op.id)}>✏️</button>
                    <button className="btn btn-danger" style={{ fontSize: 10 }}
                      onClick={() => handleDeletarOpcao(op.id, tipoOpcao)}>✕</button>
                  </div>
                  {editOpcao === op.id && (
                    <div style={{ gridColumn: '1/-1', marginTop: 6 }}>
                      <OpcaoForm tipo={tipoOpcao} initial={op}
                        onSalvar={handleSalvarOpcao}
                        onCancelar={() => setEditOpcao(null)} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── 4. Campos extras ── */}
            <div className="section">
              <h2>➕ Campos Personalizados</h2>
              {localCustom.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 24px', gap: 6, marginBottom: 8 }}>
                  <input placeholder="Nome do campo"
                    value={c.label} onChange={e => updCampoCustom(i, 'label', e.target.value)} />
                  <select value={c.tipo} onChange={e => updCampoCustom(i, 'tipo', e.target.value)}>
                    <option value="texto">Texto</option>
                    <option value="numero">Número</option>
                    <option value="area">Área</option>
                    <option value="checkbox">Check</option>
                  </select>
                  <button type="button" onClick={() => remCampoCustom(i)}
                    style={{ background: 'none', border: 'none', color: '#e05050', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={addCampoCustom}>
                + Novo Campo
              </button>
            </div>

            {/* ── 5. Bloqueio da ficha ── */}
            <div className="section">
              <h2>🔒 Controle de Edição</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={localLocked}
                  onChange={e => setLocalLocked(e.target.checked)} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                    {localLocked ? '🔒 Ficha bloqueada para jogadores' : '🔓 Jogadores podem editar campos permitidos'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>
                    Quando bloqueada, apenas o mestre edita atributos base.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* ══ PAINEL DIREITO: Preview ══ */}
          {preview && (
            <div className="pers-preview-panel">
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '1.5px', marginBottom: 10 }}>
                PREVIEW AO VIVO
              </div>
              <FichaPreview
                campos={localCampos}
                labels={localLabels}
                tema={localTema}
                camposCustom={localCustom}
              />
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--ink-dim)', fontStyle: 'italic', textAlign: 'center' }}>
                Visualização aproximada. Dados reais ao abrir a ficha.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
