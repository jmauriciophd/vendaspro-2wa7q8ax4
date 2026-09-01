import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { profileService, userService } from '@/services/crm'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { toast } from 'sonner'
import {
  User as UserIcon,
  Shield,
  Lock,
  Mail,
  Phone,
  Camera,
  Trash2,
  Save,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react'

export function MeuPerfil() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'dados' | 'seguranca'>('dados')

  // Form Dados Pessoais
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form Segurança / Senha
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string
    new?: string
    confirm?: string
  }>({})

  // Carregar dados iniciais do usuário
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || '')
      if (user.avatar) {
        setAvatarPreview(userService.avatarUrl(user))
      } else {
        setAvatarPreview(null)
      }
      setAvatarFile(null)
      setRemoveAvatar(false)
    }
  }, [user])

  // Manipular seleção de arquivo de imagem
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validar executáveis e extensões proibidas
    const blockedExtensions = [
      '.exe',
      '.bat',
      '.sh',
      '.php',
      '.phtml',
      '.js',
      '.ts',
      '.py',
      '.rb',
      '.pl',
      '.cgi',
      '.jar',
      '.vbs',
      '.msi',
      '.cmd',
      '.com',
      '.scr',
      '.ps1',
    ]
    const fileName = file.name.toLowerCase()
    for (const ext of blockedExtensions) {
      if (fileName.endsWith(ext)) {
        toast.error('Tipo de arquivo não permitido para foto de perfil.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    // 2. Validar MIME type
    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo selecionado deve ser uma imagem válida (JPEG, PNG, WEBP, etc).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 3. Validar tamanho máximo (5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('O tamanho da foto não pode exceder 5MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setAvatarFile(file)
    setRemoveAvatar(false)
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatarClick = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Salvar Dados Pessoais
  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSavingProfile(true)
    const toastId = toast.loading('Salvando...')

    try {
      const res = await profileService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatarFile,
        remove_avatar: removeAvatar,
      })

      if (res.success) {
        toast.success('Perfil atualizado com sucesso.', { id: toastId })
        refreshUser()
      } else {
        toast.error(res.message || 'Não foi possível atualizar seu perfil.', { id: toastId })
      }
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err)
      const errorMsg =
        err?.data?.message || err?.message || 'Não foi possível atualizar seu perfil.'
      toast.error(errorMsg, { id: toastId })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors({})

    let hasError = false
    const newErrs: { current?: string; new?: string; confirm?: string } = {}

    if (!currentPassword) {
      newErrs.current = 'Informe a senha atual.'
      hasError = true
    }

    if (!newPassword) {
      newErrs.new = 'Informe a nova senha.'
      hasError = true
    } else if (newPassword.length < 8) {
      newErrs.new = 'A nova senha deve ter no mínimo 8 caracteres.'
      hasError = true
    }

    if (!confirmPassword) {
      newErrs.confirm = 'Confirme a nova senha.'
      hasError = true
    } else if (newPassword !== confirmPassword) {
      newErrs.confirm = 'As senhas informadas não coincidem.'
      hasError = true
    }

    if (hasError) {
      setPasswordErrors(newErrs)
      if (newErrs.confirm === 'As senhas informadas não coincidem.') {
        toast.error('As senhas informadas não coincidem.')
      } else if (newErrs.new === 'A nova senha deve ter no mínimo 8 caracteres.') {
        toast.error('A nova senha deve ter no mínimo 8 caracteres.')
      }
      return
    }

    setIsChangingPassword(true)
    const toastId = toast.loading('Alterando senha...')

    try {
      const res = await profileService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      if (res.success) {
        toast.success('Senha alterada com sucesso.', { id: toastId })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordErrors({})
      } else {
        toast.error(res.message || 'Não foi possível alterar sua senha.', { id: toastId })
      }
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err)
      const errorMsg = err?.data?.message || err?.message || 'Não foi possível alterar sua senha.'

      if (errorMsg.includes('senha atual está incorreta')) {
        setPasswordErrors({ current: 'A senha atual está incorreta.' })
        toast.error('A senha atual está incorreta.', { id: toastId })
      } else if (errorMsg.includes('não coincidem')) {
        setPasswordErrors({ confirm: 'As senhas informadas não coincidem.' })
        toast.error('As senhas informadas não coincidem.', { id: toastId })
      } else {
        toast.error(errorMsg, { id: toastId })
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  const roleLabelMap: Record<string, string> = {
    admin: 'Administrador',
    gerente: 'Gerente Comercial',
    vendedor: 'Vendedor',
  }

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    gerente: 'bg-blue-100 text-blue-700 border-blue-200',
    vendedor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  const userInitials = (user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meu Perfil</h1>
            {user?.is_super_admin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie suas informações cadastrais e credenciais de acesso ao CRM.
          </p>
        </div>

        {/* Card resumo do usuário logado */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={user?.name || 'Avatar'}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200/60">
                {userInitials}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || 'Usuário'}
            </p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                roleBadgeColor[user?.role || 'vendedor'] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {roleLabelMap[user?.role || 'vendedor'] || user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('dados')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dados'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Dados pessoais</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'seguranca'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Segurança</span>
        </button>
      </div>

      {/* Conteúdo da Aba: DADOS PESSOAIS */}
      {activeTab === 'dados' && (
        <form
          onSubmit={handleSavePersonalData}
          className="space-y-6 max-w-3xl animate-in fade-in-50 duration-150"
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Informações Pessoais</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atualize seus dados de contato e foto de exibição.
              </p>
            </div>

            {/* Foto de Perfil / Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Foto de Perfil"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100/70 text-indigo-700 font-extrabold text-xl flex items-center justify-center border-2 border-dashed border-indigo-300">
                    {userInitials}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-xs font-bold text-slate-800">Foto de Perfil</h3>
                <p className="text-[11px] text-slate-500">
                  Formatos aceitos: JPG, PNG, WEBP, GIF. Tamanho máximo: 5MB. Executáveis são
                  bloqueados por segurança.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload-input"
                  />
                  <label
                    htmlFor="avatar-upload-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer shadow-2xs transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{avatarPreview ? 'Trocar foto' : 'Enviar foto'}</span>
                  </label>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatarClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl cursor-pointer shadow-2xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* E-mail (Somente Leitura protegido com cadeado) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                E-mail da Conta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  disabled
                  readOnly
                  value={user?.email || ''}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-100/90 text-sm text-slate-600 font-medium border border-slate-200 rounded-xl cursor-not-allowed select-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                <Lock className="w-3 h-3 text-slate-400 inline shrink-0" />
                O e-mail da conta não pode ser alterado pelo usuário.
              </p>
            </div>

            {/* Dados Administrativos do Perfil (Somente Leitura) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Perfil de Acesso
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <BadgeCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {roleLabelMap[user?.role || 'vendedor'] || user?.role}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status da Conta
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">
                    {user?.active !== false ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Conteúdo da Aba: SEGURANÇA */}
      {activeTab === 'seguranca' && (
        <div className="space-y-6 max-w-3xl animate-in fade-in-50 duration-150">
          <form onSubmit={handleChangePassword}>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Alterar senha</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Para sua segurança, informe sua senha atual antes de cadastrar uma nova.
                </p>
              </div>

              {/* Requisitos de Senha */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Requisitos de segurança para a nova senha:
                </span>
                <ul className="list-disc list-inside text-indigo-800/90 text-[11px] space-y-0.5 pl-1">
                  <li>Mínimo de 8 caracteres</li>
                  <li>Recomendamos combinar letras maiúsculas, minúsculas, números e símbolos</li>
                  <li>A nova senha não deve ser compartilhada com terceiros</li>
                </ul>
              </div>

              <div className="space-y-4">
                {/* Senha Atual */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Senha atual <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      if (passwordErrors.current)
                        setPasswordErrors((prev) => ({ ...prev, current: undefined }))
                    }}
                    placeholder="Informe sua senha atual"
                    error={Boolean(passwordErrors.current)}
                    iconLeft={<Lock className="w-4 h-4" />}
                    autoComplete="current-password"
                  />
                  {passwordErrors.current && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {passwordErrors.current}
                    </p>
                  )}
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nova senha <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (passwordErrors.new)
                        setPasswordErrors((prev) => ({ ...prev, new: undefined }))
                    }}
                    placeholder="Mínimo 8 caracteres"
                    error={Boolean(passwordErrors.new)}
                    iconLeft={<KeyRound className="w-4 h-4" />}
                    autoComplete="new-password"
                  />
                  {passwordErrors.new && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {passwordErrors.new}
                    </p>
                  )}
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirmar nova senha <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (passwordErrors.confirm)
                        setPasswordErrors((prev) => ({ ...prev, confirm: undefined }))
                    }}
                    placeholder="Repita a nova senha exatamente igual"
                    error={Boolean(passwordErrors.confirm)}
                    iconLeft={<KeyRound className="w-4 h-4" />}
                    autoComplete="new-password"
                  />
                  {passwordErrors.confirm && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {passwordErrors.confirm}
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Envio */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Alterando...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Alterar senha</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
export default MeuPerfil
