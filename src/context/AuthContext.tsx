import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User, AppPermission } from '@/types/crm'

type Role = 'admin' | 'gerente' | 'vendedor'

// Default permissions by role (baseline)
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, AppPermission[]> = {
  admin: [
    'users.view',
    'users.create',
    'users.edit',
    'users.disable',
    'users.delete',
    'audit.view',
    'commissions.view',
    'commissions.create',
    'commissions.edit',
    'commissions.approve',
    'commissions.pay',
    'reports.view',
    'reports.export',
    'settings.view',
    'settings.edit',
    'settings.email.view',
    'settings.email.edit',
    'settings.email.test',
    'payments.view',
    'payments.create',
    'payments.send',
    'payments.cancel',
    'payments.refund',
    'payments.reconcile',
    'payments.providers.manage',
    'backups.view',
    'backups.create',
    'backups.download',
    'backups.settings',
    'templates.view',
    'templates.create',
    'templates.edit',
    'templates.delete',
    'templates.publish',
    'templates.custom_html',
    'templates.custom_css',
    'templates.custom_js',
    'catalogs.view',
    'catalogs.create',
    'catalogs.edit',
    'catalogs.publish',
    'catalogs.delete',
    'catalogs.share',
    'orders.view',
    'pages.analytics',
  ],
  gerente: [
    'users.view',
    'commissions.view',
    'commissions.create',
    'commissions.edit',
    'commissions.approve',
    'commissions.pay',
    'reports.view',
    'reports.export',
    'payments.view',
    'payments.create',
    'payments.send',
    'payments.reconcile',
    'templates.view',
    'templates.create',
    'templates.edit',
    'catalogs.view',
    'catalogs.create',
    'catalogs.edit',
    'catalogs.publish',
    'catalogs.share',
    'orders.view',
    'pages.analytics',
  ],
  vendedor: [
    'commissions.view',
    'payments.view',
    'payments.create',
    'payments.send',
    'templates.view',
    'catalogs.view',
    'catalogs.create',
    'catalogs.edit',
    'catalogs.publish',
    'catalogs.share',
    'orders.view',
    'pages.analytics',
  ],
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => void
  role: Role
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin: boolean
  canManageTeam: boolean
  can: (permission: AppPermission | string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      return pb.authStore.record as unknown as User
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, model) => {
      setUser(model as unknown as User | null)
    })

    const initAuth = async () => {
      if (pb.authStore.isValid && pb.authStore.token) {
        try {
          const authData = await pb.collection('users').authRefresh<User>()
          setUser(authData.record)
        } catch (err) {
          console.warn('Sessão expirada ou inválida ao atualizar token:', err)
          pb.authStore.clear()
          setUser(null)
        }
      } else {
        pb.authStore.clear()
        setUser(null)
      }
      setIsLoading(false)
    }

    initAuth()

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword<User>(email, pass)
    setUser(authData.record)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const refreshUser = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as unknown as User)
    }
  }

  const role: Role = (user?.role as Role) || 'vendedor'
  const isSuperAdmin = Boolean(user?.is_super_admin || user?.email === 'jmauriciophd@gmail.com')
  const isAdmin = role === 'admin' || isSuperAdmin
  const isManager = isAdmin || role === 'gerente'
  const canManageTeam = isManager

  const can = (permission: AppPermission | string): boolean => {
    if (!user) return false
    // Super admin can do EVERYTHING always
    if (isSuperAdmin) return true

    // Check custom permissions list on user record
    const customPerms: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : typeof user.permissions === 'string'
        ? JSON.parse(user.permissions || '[]')
        : []

    if (customPerms.includes(permission)) return true

    // Check role default baseline permissions
    const defaults = ROLE_DEFAULT_PERMISSIONS[role] || []
    return defaults.includes(permission as AppPermission)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        role,
        isAdmin,
        isManager,
        isSuperAdmin,
        canManageTeam,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
