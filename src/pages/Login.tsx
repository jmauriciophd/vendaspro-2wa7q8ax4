import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Store,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Login() {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('jmauriciophd@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)

  // Field validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (mode === 'register' && !name.trim()) {
      errs.name = 'Nome completo é obrigatório'
    }
    if (!email.trim()) {
      errs.email = 'E-mail é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Insira um e-mail válido'
    }
    if (!password) {
      errs.password = 'Senha é obrigatória'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter no mínimo 8 caracteres'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        toast.success('Login realizado com sucesso!')
      } else {
        await register(name.trim(), email.trim(), password)
        toast.success('Conta criada com sucesso!')
      }
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error(err)
      toast.error(
        err?.data?.message || err?.message || 'Falha ao autenticar. Verifique suas credenciais.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden font-sans">
      {/* Background Dot Pattern & Soft Gradient */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#4F46E5 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-200/40 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 relative z-10 transition-all duration-200">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM de Vendas</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Equipe Comercial • Pequenos Mercadinhos
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta comercial'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'login'
              ? 'Insira suas credenciais para acessar o painel'
              : 'Preencha seus dados para começar a gerenciar vendas'}
          </p>
        </div>

        {/* Credentials helper banner */}
        {mode === 'login' && (
          <div className="mb-5 p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-indigo-950">Acesso de Demonstração:</span>
              <span>
                E-mail:{' '}
                <strong className="font-mono text-indigo-700">jmauriciophd@gmail.com</strong>
              </span>
              <br />
              <span>
                Senha: <strong className="font-mono text-indigo-700">Skip@Pass</strong>
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                  }}
                  placeholder="Ex: João Maurício"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 border rounded-xl outline-none transition-all ${
                    errors.name
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail Comercial
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                }}
                placeholder="seu.email@empresa.com.br"
                className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 border rounded-xl outline-none transition-all ${
                  errors.email
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Senha</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      'Para redefinir a senha do usuário demo, utilize a credencial padrão Skip@Pass.',
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 border rounded-xl outline-none transition-all ${
                  errors.password
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar no Sistema' : 'Cadastrar e Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-600">
              Não possui uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setErrors({})
                }}
                className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
              >
                Criar conta
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Já tem cadastro?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setErrors({})
                }}
                className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
              >
                Fazer login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
