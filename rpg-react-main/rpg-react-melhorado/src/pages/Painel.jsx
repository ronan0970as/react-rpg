import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useMesa } from '../contexts/MesaContext';
import { supabase } from '../supabase';
import { ThemePicker, showToast } from '../components';
import { entrarNaMesa, criarMesa } from '../data';

export default function PainelPage() {
  const { sessaoCache, isMestre, mesaAtiva, ativarMesa, logout } = useAuth();
  const { convites, recarregarConvites, responderConvite, mesaId } = useMesa();
  const navigate = useNavigate();

  const [fichas,     setFichas]     = useState([]);
  const [mesas,      setMesas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [ctxMenu,    setCtxMenu]    = useState(null);
  const [modal,      setModal]      = useState(null);
  const [modalInput, setModalInput] = useState('');
  const [alvo,       setAlvo]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [tipoNova,   setTipoNova]   = useState('padrao'); // 'padrao' | 'personalizada'

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: fs }, { data: ms }] = await Promise.all([
        supabase.from('fichas').select('id,nome,foto,tipo,mesa_id').eq('user_id', sessaoCache.id).order('created_at', { ascending: false }),
        isMestre
          ? supabase.from('mesas').select('*').eq('mestre_id', sessaoCache.id).order('created_at', { ascending: false })
          : supabase.from('mesa_membros').select('*, mesa:mesas(*)').eq('user_id', sessaoCache.id).eq('status', 'ativo'),
      ]);
      setFichas(fs || []);
      setMesas(isMestre ? (ms || []) : (ms?.map(m => m.mesa).filter(Boolean) || []));
    } finally { setLoading(false); }
  }, [sessaoCache.id, isMestre]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { if (ctxMenu) { const h = () => setCtxMenu(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); } }, [ctxMenu]);

  function selecionarFicha(id) { localStorage.setItem('rpg_ficha_ativa', id); navigate('/status'); }
  function abrirCtx(e, f) { e.stopPropagation(); setCtxMenu({ fichaId: f.id, fichaNome: f.nome, x: Math.min(e.clientX, window.innerWidth-180), y: Math.min(e.clientY, window.innerHeight-160) }); }
  function fechar() { setModal(null); setModalInput(''); setAlvo(null); }

  async function criarFicha() {
    const nome = modalInput.trim() || 'Nova Ficha';
    setSaving(true);
    try {
      const mesaVincId = tipoNova === 'personalizada' && mesaAtiva ? mesaAtiva.id : null;
      const { data, error } = await supabase.from('fichas')
        .insert({ nome, user_id: sessaoCache.id, foto: '', tipo: tipoNova, mesa_id: mesaVincId })
        .select().single();
      if (error) throw error;
      localStorage.setItem('rpg_ficha_ativa', data.id);
      navigate('/status');
    } catch (err) { showToast('Erro: '+err.message, '#e74c3c'); }
    finally { setSaving(false); fechar(); }
  }

  async function renomear() {
    const nome = modalInput.trim(); if (!nome) return;
    setSaving(true);
    try {
      await supabase.from('fichas').update({ nome }).eq('id', alvo);
      setFichas(f => f.map(x => x.id === alvo ? { ...x, nome } : x));
      showToast('✓ Renomeada');
    } catch { showToast('Erro ao renomear.', '#e74c3c'); }
    finally { setSaving(false); fechar(); }
  }

  async function excluir() {
    setSaving(true);
    try {
      await supabase.from('fichas_dados').delete().eq('ficha_id', alvo);
      await supabase.from('fichas').delete().eq('id', alvo);
      if (localStorage.getItem('rpg_ficha_ativa') === alvo) localStorage.removeItem('rpg_ficha_ativa');
      setFichas(f => f.filter(x => x.id !== alvo));
      showToast('Ficha excluída.');
    } catch { showToast('Erro ao excluir.', '#e74c3c'); }
    finally { setSaving(false); fechar(); }
  }

  async function entrarMesa() {
    const cod = modalInput.trim(); if (!cod) return;
    setSaving(true);
    try { const m = await entrarNaMesa(cod); ativarMesa(m); showToast('✨ '+m.nome); await carregar(); recarregarConvites(); }
    catch (err) { showToast(err.message, '#e74c3c'); }
    finally { setSaving(false); fechar(); }
  }

  async function criarNovaMesa() {
    const nome = modalInput.trim(); if (!nome) return;
    setSaving(true);
    try { const m = await criarMesa(nome); setMesas(p => [m,...p]); showToast('Mesa criada: '+m.codigo_convite); }
    catch (err) { showToast(err.message, '#e74c3c'); }
    finally { setSaving(false); fechar(); }
  }

  async function aceitarConvite(convite) {
    setSaving(true);
    try {
      await responderConvite(convite.id, true);
      if (convite.mesa) { ativarMesa(convite.mesa); await carregar(); }
      showToast('✨ Entrou em: ' + (convite.mesa?.nome || 'mesa'));
    } catch (err) { showToast(err.message, '#e74c3c'); }
    finally { setSaving(false); }
  }

  const fichaAtiva = localStorage.getItem('rpg_ficha_ativa');

  return (
    <>
      <div className="painel-header">
        <div className="painel-header-inner">
          <div className="painel-logo">
            <span className="painel-logo-icon">🏰</span>
            <div>
              <div className="painel-logo-title">Torre das Fichas</div>
              <div className="painel-logo-sub">
                {sessaoCache?.nome}
                {isMestre && <span className="badge-mestre">👑 Mestre</span>}
              </div>
            </div>
          </div>
          <div className="painel-header-actions">
            {isMestre && <button className="btn btn-ghost" onClick={()=>navigate('/mestre')}>👑 Dashboard</button>}
            {isMestre && <button className="btn btn-ghost" onClick={()=>navigate('/personalizar')}>🎨 Personalizar</button>}
            {!isMestre && <button className="btn btn-ghost" onClick={()=>{setModal('entrar-mesa');setModalInput('');}}>🗺️ Entrar em Mesa</button>}
            <button className="btn btn-danger" onClick={logout}>↩ Sair</button>
          </div>
        </div>
      </div>

      <ThemePicker defaultTheme="sombria"/>

      <div className="painel-body">

        {/* Convites pendentes */}
        {!isMestre && convites.length > 0 && (
          <div className="painel-section">
            <div className="painel-section-title">✉️ CONVITES PARA MESAS <span style={{color:'var(--gold)',marginLeft:6}}>{convites.length}</span></div>
            <div className="convites-lista">
              {convites.map(c => (
                <div key={c.id} className="convite-card">
                  <span className="convite-icon">{c.mesa?.icone||'🏛️'}</span>
                  <div className="convite-info">
                    <div className="convite-mesa">{c.mesa?.nome||'Mesa'}</div>
                    {c.mensagem && <div className="convite-msg">{c.mensagem}</div>}
                    <div className="convite-exp">Expira: {new Date(c.expires_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="convite-acoes">
                    <button className="btn btn-primary" style={{fontSize:11}} onClick={()=>aceitarConvite(c)} disabled={saving}>✓ Aceitar</button>
                    <button className="btn btn-danger"  style={{fontSize:11}} onClick={()=>responderConvite(c.id,false)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mesa ativa (jogador) */}
        {!isMestre && mesaAtiva && (
          <div className="painel-section">
            <div className="painel-section-title">⚔️ MESA ATIVA</div>
            <div className="mesa-ativa-card">
              <div><div className="mesa-nome">{mesaAtiva.nome}</div></div>
              <button className="btn btn-ghost" onClick={()=>ativarMesa(null)}>Sair da mesa</button>
            </div>
          </div>
        )}

        {/* Mesas do mestre */}
        {isMestre && (
          <div className="painel-section">
            <div className="painel-section-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>🏛️ MINHAS MESAS</span>
              <button className="btn btn-primary" style={{fontSize:10}} onClick={()=>{setModal('nova-mesa');setModalInput('');}}>+ Nova Mesa</button>
            </div>
            {mesas.length===0 ? <div className="painel-empty-small">Nenhuma mesa criada.</div> : (
              <div className="mesas-grid">
                {mesas.map(m=>(
                  <div key={m.id} className={`mesa-card${mesaAtiva?.id===m.id?' ativa':''}`}
                    onClick={()=>{ativarMesa(m);navigate('/mestre');}}>
                    <div className="mesa-card-icon">{m.icone||'🏛️'}</div>
                    <div className="mesa-card-info">
                      <div className="mesa-card-nome">{m.nome}</div>
                      <div className="mesa-card-desc">Código: <strong style={{color:'var(--gold)'}}>{m.codigo_convite}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mesas do jogador */}
        {!isMestre && mesas.length>0 && (
          <div className="painel-section">
            <div className="painel-section-title">🗺️ MINHAS MESAS</div>
            <div className="mesas-grid">
              {mesas.map(m=>(
                <div key={m.id} className={`mesa-card${mesaAtiva?.id===m.id?' ativa':''}`} onClick={()=>ativarMesa(m)}>
                  <div className="mesa-card-icon">{m.icone||'🗺️'}</div>
                  <div className="mesa-card-info">
                    <div className="mesa-card-nome">{m.nome}</div>
                  </div>
                  {mesaAtiva?.id===m.id&&<span className="badge-ativa">Ativa</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid de fichas */}
        <div className="painel-section">
          <div className="painel-section-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>📜 MINHAS FICHAS</span>
            <button className="btn btn-primary" style={{fontSize:10}} onClick={()=>{setModal('nova');setModalInput('');setTipoNova('padrao');}}>+ Nova Ficha</button>
          </div>
          {loading ? (
            <div className="painel-fichas-grid">
              {[0,1,2,3].map(i=><div key={i} className="painel-card skeleton"/>)}
            </div>
          ) : fichas.length===0 ? (
            <div className="painel-empty">
              <div style={{fontSize:52,opacity:0.2,marginBottom:12}}>📜</div>
              <div style={{fontFamily:'var(--font-heading)',fontSize:13,color:'var(--ink-dim)',letterSpacing:1}}>Nenhuma ficha criada</div>
              <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>{setModal('nova');setModalInput('');setTipoNova('padrao');}}>✨ Criar Primeira Ficha</button>
            </div>
          ) : (
            <div className="painel-fichas-grid">
              {fichas.map(f=>(
                <div key={f.id} className={`painel-card${f.id===fichaAtiva?' card-ativa':''}`} onClick={()=>selecionarFicha(f.id)}>
                  <div className="painel-card-top-bar"/>
                  {f.foto ? <img src={f.foto} alt={f.nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,opacity:0.12}}>🧙</div>}
                  {f.tipo==='personalizada' && <div className="ficha-tipo-badge">✦ Custom</div>}
                  <div className="painel-card-overlay"><span className="painel-card-nome">{f.nome||'Sem nome'}</span></div>
                  {f.id===fichaAtiva&&<div style={{position:'absolute',top:6,right:28,background:'rgba(212,169,67,0.2)',border:'1px solid var(--gold)',borderRadius:3,padding:'1px 5px',fontSize:8,color:'var(--gold)',fontFamily:'var(--font-heading)',fontWeight:700}}>ATIVA</div>}
                  <button className="painel-card-menu" onClick={e=>abrirCtx(e,f)}>⋮</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu&&(
        <div className="ctx-menu-box" style={{top:ctxMenu.y,left:ctxMenu.x}} onClick={e=>e.stopPropagation()}>
          <button className="ctx-item" onClick={()=>{selecionarFicha(ctxMenu.fichaId);setCtxMenu(null);}}>⚔️ Abrir Ficha</button>
          <button className="ctx-item" onClick={()=>{setAlvo(ctxMenu.fichaId);setModalInput(ctxMenu.fichaNome);setModal('rename');setCtxMenu(null);}}>✏️ Renomear</button>
          <div className="ctx-divider"/>
          <button className="ctx-item danger" onClick={()=>{setAlvo(ctxMenu.fichaId);setModal('delete');setCtxMenu(null);}}>🗑️ Excluir</button>
        </div>
      )}

      {/* Modais */}
      {modal&&(
        <div className="modal-overlay" onClick={fechar}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>

            {modal==='nova'&&<>
              <div className="modal-title">📜 Nova Ficha</div>
              <input type="text" value={modalInput} onChange={e=>setModalInput(e.target.value)} placeholder="Nome do personagem" autoFocus onKeyDown={e=>e.key==='Enter'&&criarFicha()}/>
              <div style={{marginTop:12}}>
                <label style={{display:'block',fontSize:10,color:'var(--ink-dim)',marginBottom:8,fontFamily:'var(--font-heading)',letterSpacing:'0.8px'}}>TIPO DE FICHA</label>
                <div style={{display:'flex',gap:8}}>
                  {[{v:'padrao',icon:'📄',l:'Padrão',d:'Ficha padrão do sistema'},
                    {v:'personalizada',icon:'✦',l:'Personalizada',d:'Usa layout da mesa ativa'}].map(opt=>(
                    <button key={opt.v} type="button" onClick={()=>setTipoNova(opt.v)}
                      style={{flex:1,padding:'10px 8px',borderRadius:6,cursor:'pointer',
                        background:tipoNova===opt.v?'rgba(212,169,67,0.1)':'rgba(0,0,0,0.3)',
                        border:`2px solid ${tipoNova===opt.v?'var(--gold)':'var(--border-dim)'}`,
                        display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <span style={{fontSize:20}}>{opt.icon}</span>
                      <span style={{fontSize:11,fontFamily:'var(--font-heading)',color:'var(--ink)'}}>{opt.l}</span>
                      <span style={{fontSize:9,color:'var(--ink-dim)',textAlign:'center'}}>{opt.d}</span>
                    </button>
                  ))}
                </div>
                {tipoNova==='personalizada'&&!mesaAtiva&&(
                  <div style={{marginTop:8,padding:'6px 10px',background:'rgba(192,80,50,0.1)',border:'1px solid rgba(192,80,50,0.3)',borderRadius:5,fontSize:11,color:'#e07050'}}>
                    ⚠ Selecione uma mesa ativa no painel para vincular esta ficha.
                  </div>
                )}
                {tipoNova==='personalizada'&&mesaAtiva&&(
                  <div style={{marginTop:8,padding:'6px 10px',background:'rgba(76,175,80,0.08)',border:'1px solid rgba(76,175,80,0.2)',borderRadius:5,fontSize:11,color:'#4CAF50'}}>
                    ✓ Será vinculada à mesa: <strong>{mesaAtiva.nome}</strong>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={criarFicha} disabled={saving}>{saving?'...':'Criar'}</button>
                <button className="modal-btn secondary" onClick={fechar}>Cancelar</button>
              </div>
            </>}

            {modal==='rename'&&<>
              <div className="modal-title">✏️ Renomear</div>
              <input type="text" value={modalInput} onChange={e=>setModalInput(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&renomear()}/>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={renomear} disabled={saving}>Salvar</button>
                <button className="modal-btn secondary" onClick={fechar}>Cancelar</button>
              </div>
            </>}

            {modal==='delete'&&<>
              <div className="modal-title">🗑️ Excluir Ficha?</div>
              <p style={{fontSize:13,color:'var(--ink-dim)'}}>Todos os dados serão perdidos permanentemente.</p>
              <div className="modal-actions">
                <button className="modal-btn primary" style={{background:'#c0392b',color:'#fff'}} onClick={excluir} disabled={saving}>{saving?'...':'Excluir'}</button>
                <button className="modal-btn secondary" onClick={fechar}>Cancelar</button>
              </div>
            </>}

            {modal==='entrar-mesa'&&<>
              <div className="modal-title">🗺️ Entrar em Mesa</div>
              <p style={{fontSize:12,color:'var(--ink-dim)',marginBottom:12}}>Peça o código de convite ao seu Mestre.</p>
              <input type="text" value={modalInput} onChange={e=>setModalInput(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DA MESA" autoFocus maxLength={12}
                style={{textTransform:'uppercase',letterSpacing:4,textAlign:'center',fontSize:18}}
                onKeyDown={e=>e.key==='Enter'&&entrarMesa()}/>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={entrarMesa} disabled={saving}>{saving?'...':'Entrar'}</button>
                <button className="modal-btn secondary" onClick={fechar}>Cancelar</button>
              </div>
            </>}

            {modal==='nova-mesa'&&<>
              <div className="modal-title">🏛️ Nova Mesa</div>
              <input type="text" value={modalInput} onChange={e=>setModalInput(e.target.value)} placeholder="Nome da mesa" autoFocus onKeyDown={e=>e.key==='Enter'&&criarNovaMesa()}/>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={criarNovaMesa} disabled={saving}>{saving?'...':'Criar Mesa'}</button>
                <button className="modal-btn secondary" onClick={fechar}>Cancelar</button>
              </div>
            </>}

          </div>
        </div>
      )}
    </>
  );
}
