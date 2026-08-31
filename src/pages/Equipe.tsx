import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Mail,
  X,
  CheckCircle,
  UserCircle2,
  Search,
} from 'lucide-react'
import { userService } from '@/services/crm'
import { useAuth, ROLE_DEFAULT_PERMISSIONS } from '@/context/AuthContext'
import type { User, UserRole, AppPermission } from '@/types/crm'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

const roleConfig: Record<UserRole, { label: string; icon: any; bg: string; description: string }> =
  {
    admin: {
      label: 'Admin',
      icon: ShieldCheck,
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Acesso total ao sistema',
    },
    gerente: {
      label: 'Gerente',
      icon: ShieldHalf,
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Relatórios e dashboard da equipe',
    },
    vendedor: {
      label: 'Vendedor',
      icon: Shield,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Apenas seus próprios negócios/clientes',
    },
  }

export default function Equipe() {
  const { user: currentUser, isAdmin, can } = useAuth()
  const canCreateUser = isAdmin || can('users.create')
  const canEditUser = isAdmin || can('users.edit')
  const canDeleteUser = isAdmin || can('users.delete')

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)

  const loadUsers = async () => {
    try {
      const data = await userService.getAll()
      setUsers(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useRealtime<User>('users', () => loadUsers())

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()),
  )

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    gerentes: users.filter((u) => u.role === 'gerente').length,
    vendedores: users.filter((u) => u.role === 'vendedor').length,
    ativos: users.filter((u) => u.active !== false).length,
  }

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error('Você não pode excluir seu próprio usuário.')
      return
    }
    if (u.is_super_admin || u.email === 'jmauriciophd@gmail.com') {
      toast.error('O Super Administrador não pode ser excluído.')
      return
    }
    if (!confirm(`Deseja realmente excluir o usuário "${u.name || u.email}"?`)) return
    try {
      await userService.delete(u.id)
      toast.success('Usuário removido')
      loadUsers()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao excluir usuário')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Equipe & Acessos
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {users.length} usuários
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie vendedores, gerentes e administradores do CRM
          </p>
        </div>

        {canCreateUser && (
          <button
            onClick={() => {
              setUserToEdit(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Membro</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['admin', 'gerente', 'vendedor'] as UserRole[]).map((r) => {
          const cfg = roleConfig[r]
          const Icon = cfg.icon
          return (
            <div
              key={r}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900">
                  {r === 'admin'
                    ? stats.admins
                    : r === 'gerente'
                      ? stats.gerentes
                      : stats.vendedores}
                </span>
                <p className="text-[11px] text-slate-500">{cfg.label}</p>
              </div>
            </div>
          )
        })}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">{stats.ativos}</span>
            <p className="text-[11px] text-slate-500">Ativos</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando equipe...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhum usuário encontrado</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Criado em</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const cfg = roleConfig[u.role || 'vendedor']
                  const RoleIcon = cfg.icon
                  const isSelf = u.id === currentUser?.id
                  const isSuperAdminUser = u.is_super_admin || u.email === 'jmauriciophd@gmail.com'
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                            {(u.name || u.email || 'U')
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0].toUpperCase())
                              .join('')}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{u.name || 'Sem nome'}</span>
                              {isSuperAdminUser && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                                  Super Admin
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] text-indigo-600 font-semibold">
                                  (você)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(u.created).toLocaleDateString('pt-BR')}
                      </td>
                      {(canEditUser || canDeleteUser || isAdmin) && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {((canEditUser && (!isSuperAdminUser || isSelf)) || isSelf) && (
                              <button
                                onClick={() => {
                                  setUserToEdit(u)
                                  setIsModalOpen(true)
                                }}
                                title="Editar usuário e permissões"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isSelf && !isSuperAdminUser && canDeleteUser && (
                              <button
                                onClick={() => handleDelete(u)}
                                title="Excluir usuário"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Permissões por Papel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(roleConfig) as UserRole[]).map((r) => {
            const cfg = roleConfig[r]
            const Icon = cfg.icon
            return (
              <div key={r} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${cfg.bg.split(' ')[1]}`} />
                  <span className="text-xs font-bold text-slate-800">{cfg.label}</span>
                </div>
                <p className="text-[11px] text-slate-500">{cfg.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {isModalOpen && (
        <UserModal
          userToEdit={userToEdit}
          onClose={() => {
            setIsModalOpen(false)
            setUserToEdit(null)
          }}
          onSaved={loadUsers}
        />
      )}
    </div>
  )
}

// ---- User Modal (inline) ----
import React from 'react'

interface UserModalProps {
  userToEdit: User | null
  onClose: () => void
  onSaved: () => void
}

const PERMISSION_MODULES = [
  {
    module: 'Equipe & Usuários',
    permissions: [
      { key: 'users.view', label: 'Visualizar membros da equipe' },
      { key: 'users.create', label: 'Cadastrar novos usuários' },
      { key: 'users.edit', label: 'Editar usuários e cargos' },
      { key: 'users.disable', label: 'Desativar/Ativar contas' },
      { key: 'users.delete', label: 'Excluir usuários' },
    ],
  },
  {
    module: 'Auditoria & Segurança',
    permissions: [{ key: 'audit.view', label: 'Visualizar logs de auditoria' }],
  },
  {
    module: 'Comissões',
    permissions: [
      { key: 'commissions.view', label: 'Visualizar comissões gerais' },
      { key: 'commissions.create', label: 'Calcular comissões do período' },
      { key: 'commissions.edit', label: 'Editar regras e valores' },
      { key: 'commissions.approve', label: 'Aprovar comissões pendentes' },
      { key: 'commissions.pay', label: 'Marcar comissões como pagas' },
    ],
  },
  {
    module: 'Relatórios & Exportações',
    permissions: [
      { key: 'reports.view', label: 'Visualizar relatórios gerenciais' },
      { key: 'reports.export', label: 'Exportar dados para Excel/PDF' },
    ],
  },
  {
    module: 'Configurações do Sistema',
    permissions: [
      { key: 'settings.view', label: 'Visualizar dados fiscais e SMTP' },
      { key: 'settings.edit', label: 'Editar configurações e testar SMTP' },
    ],
  },
  {
    module: 'Cobranças & Pagamentos',
    permissions: [
      { key: 'payments.view', label: 'Visualizar cobranças' },
      { key: 'payments.create', label: 'Gerar novas cobranças Pix/Boleto' },
      { key: 'payments.send', label: 'Enviar cobrança por email/WhatsApp' },
      { key: 'payments.cancel', label: 'Cancelar cobranças' },
      { key: 'payments.refund', label: 'Estornar valores pagos' },
      { key: 'payments.reconcile', label: 'Realizar conciliação bancária' },
      { key: 'payments.providers.manage', label: 'Configurar gateways de pagamento' },
    ],
  },
]

const UserModal: React.FC<UserModalProps> = ({ userToEdit, onClose, onSaved }) => {
  const isSuperAdminTarget =
    userToEdit?.is_super_admin || userToEdit?.email === 'jmauriciophd@gmail.com'

  const [name, setName] = useState(userToEdit?.name || '')
  const [email, setEmail] = useState(userToEdit?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(userToEdit?.role || 'vendedor')
  const [active, setActive] = useState(userToEdit?.active !== false)

  // Custom permissions array
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => {
    if (userToEdit?.permissions) {
      if (Array.isArray(userToEdit.permissions)) return userToEdit.permissions
      try {
        return JSON.parse(userToEdit.permissions)
      } catch {
        return []
      }
    }
    return []
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toggle permission
  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey],
    )
  }

  // Preenche permissões padrão da role ao alterar a role (se for novo usuário ou se quiser resetar)
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole)
  }

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (!email.trim()) errs.email = 'Email é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Email inválido'
    if (!userToEdit && !password) errs.password = 'Senha obrigatória (min 8 chars)'
    else if (password && password.length < 8) errs.password = 'Mínimo 8 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      if (userToEdit) {
        await userService.update(userToEdit.id, {
          name: name.trim() || undefined,
          role,
          active,
          permissions: selectedPermissions,
          password: password || undefined,
        })
        toast.success('Usuário atualizado com sucesso!')
      } else {
        await userService.create({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          active,
          permissions: selectedPermissions,
        })
        toast.success('Membro da equipe criado com sucesso!')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || err?.message || 'Erro ao salvar usuário')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <UserCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {userToEdit ? 'Editar Usuário & Permissões' : 'Novo Membro da Equipe'}
              </h3>
              <p className="text-xs text-slate-500">
                {userToEdit
                  ? 'Atualize dados de acesso e permissões granulares'
                  : 'Cadastre um novo usuário com papel e permissões'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {isSuperAdminTarget && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Super Administrador:</strong> Esta conta possui acesso irrestrito a todos os
                módulos e não pode ser desativada nem rebaixada.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!userToEdit}
                placeholder="email@empresa.com.br"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                  errors.email
                    ? 'border-red-500 ring-2 ring-red-100'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                } ${userToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Senha {userToEdit ? '(deixe vazio para manter a atual)' : '*'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                errors.password
                  ? 'border-red-500 ring-2 ring-red-100'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Papel Principal (Role) *
              </label>
              <select
                value={role}
                disabled={isSuperAdminTarget}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none ${
                  isSuperAdminTarget ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <option value="admin">Admin (Acesso Total)</option>
                <option value="gerente">Gerente (Gestão & Relatórios)</option>
                <option value="vendedor">Vendedor (Operacional Comercial)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status da Conta
              </label>
              <select
                value={active ? 'true' : 'false'}
                disabled={isSuperAdminTarget}
                onChange={(e) => setActive(e.target.value === 'true')}
                className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none ${
                  isSuperAdminTarget ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo (Acesso Bloqueado)</option>
              </select>
            </div>
          </div>

          {/* Granular Permissions (RBAC) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Permissões Granulares (RBAC)
                </label>
                <p className="text-[11px] text-slate-500">
                  Adicione ou personalize permissões extras além do papel padrão.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {PERMISSION_MODULES.map((group) => (
                <div
                  key={group.module}
                  className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2"
                >
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    {group.module}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((p) => {
                      const isDefaultRolePerm = ROLE_DEFAULT_PERMISSIONS[role]?.includes(
                        p.key as AppPermission,
                      )
                      const isChecked =
                        isSuperAdminTarget ||
                        isDefaultRolePerm ||
                        selectedPermissions.includes(p.key)
                      const isDisabled = isSuperAdminTarget || isDefaultRolePerm

                      return (
                        <label
                          key={p.key}
                          className={`flex items-start gap-2 p-2 rounded-md transition-colors ${
                            isDisabled
                              ? 'bg-slate-50 opacity-75 cursor-default'
                              : 'hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleTogglePermission(p.key)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-800 block">
                              {p.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.key}
                              {isDefaultRolePerm && !isSuperAdminTarget && ' (incluso no papel)'}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{userToEdit ? 'Salvar Alterações' : 'Criar Membro'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
