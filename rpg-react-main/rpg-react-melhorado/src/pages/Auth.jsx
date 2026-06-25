import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { applyTheme } from '../components';

const ERROS = e => {
  if (!e) return 'Erro desconhecido.';
  if (e.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (e.includes('User already registered')) return 'Este e-mail já está cadastrado.';
  if (e.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (e.includes('Password should be')) return 'Senha deve ter ao menos 6 caracteres.';
  if (e.includes('Unable to validate')) return 'E-mail inválido.';
  if (e.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  return e;
};

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const { login, cadastrar, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { applyTheme('cristal'); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setInfo(''); setLoading(true);
    try {
      if (forgotMode) {
        await resetPassword(email);
        setInfo('📧 Link enviado! Verifique seu e-mail (incluindo spam).');
        setForgotMode(false);
      } else if (tab === 'login') {
        await login(email, senha);
        navigate('/painel');
      } else {
        await cadastrar(email, senha, nome);
        setInfo('✅ Conta criada! Verifique seu e-mail para ativar.');
      }
    } catch(err) { setErro(ERROS(err.message)); }
    finally { setLoading(false); }
  }

  function trocarTab(t) { setTab(t); setErro(''); setInfo(''); }

  return (
    <div className="auth-container">
      <div className="auth-box">
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:8}}>
          <div style={{fontSize:40,filter:'drop-shadow(0 0 20px rgba(212,169,67,0.6))',marginBottom:6}}>⚔️</div>
          <div className="auth-title">Ficha RPG</div>
          <p style={{fontSize:11,color:'var(--ink-dim)',fontStyle:'italic',marginTop:-12,marginBottom:0}}>Sistema de Gerenciamento de Personagens</p>
        </div>

        {!forgotMode && (
          <div className="auth-tabs">
            <button className={`auth-tab${tab==='login'?' active':''}`} onClick={()=>trocarTab('login')}>Entrar</button>
            <button className={`auth-tab${tab==='cadastro'?' active':''}`} onClick={()=>trocarTab('cadastro')}>Criar Conta</button>
          </div>
        )}

        {forgotMode && (
          <div style={{marginBottom:16}}>
            <p style={{fontSize:12,color:'var(--ink-dim)',textAlign:'center',lineHeight:1.6}}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>
        )}

        {erro && <div className="auth-error">⚠️ {erro}</div>}
        {info && <div className="auth-info">{info}</div>}

        <form onSubmit={handleSubmit}>
          {tab==='cadastro' && !forgotMode && (
            <div className="auth-field">
              <label style={{display:'block',marginBottom:4}}>Nome:</label>
              <input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome de aventureiro" autoComplete="name" style={{fontSize:14}}/>
            </div>
          )}

          <div className="auth-field">
            <label style={{display:'block',marginBottom:4}}>E-mail:</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required style={{fontSize:14}}/>
          </div>

          {!forgotMode && (
            <div className="auth-field">
              <label style={{display:'block',marginBottom:4}}>Senha:</label>
              <div style={{position:'relative'}}>
                <input type={showSenha?'text':'password'} value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={tab==='login'?'current-password':'new-password'} required style={{fontSize:14,paddingRight:42}}/>
                <button type="button" onClick={()=>setShowSenha(s=>!s)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--ink-dim)',cursor:'pointer',fontSize:16,padding:2,lineHeight:1}}>
                  {showSenha?'🙈':'👁️'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="save-btn" disabled={loading} style={{marginTop:8}}>
            {loading ? '⏳ Aguarde...' : forgotMode ? '📧 Enviar Link' : tab==='login' ? '⚔️ Entrar' : '📜 Criar Conta'}
          </button>
        </form>

        {!forgotMode && tab==='login' && (
          <button onClick={()=>{setForgotMode(true);setErro('');setInfo('');}} style={{background:'none',border:'none',color:'var(--ink-dim)',fontSize:11,cursor:'pointer',marginTop:14,display:'block',width:'100%',textAlign:'center',fontFamily:'var(--font-heading)',letterSpacing:0.5,textTransform:'uppercase',transition:'color 0.18s'}}>
            Esqueci minha senha
          </button>
        )}
        {forgotMode && (
          <button onClick={()=>{setForgotMode(false);setErro('');setInfo('');}} style={{background:'none',border:'none',color:'var(--ink-dim)',fontSize:11,cursor:'pointer',marginTop:14,display:'block',width:'100%',textAlign:'center',fontFamily:'var(--font-heading)',letterSpacing:0.5,textTransform:'uppercase',transition:'color 0.18s'}}>
            ← Voltar ao login
          </button>
        )}
      </div>
    </div>
  );
}
