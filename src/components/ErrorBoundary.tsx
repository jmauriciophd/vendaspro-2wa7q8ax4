import React, { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCw, AlertTriangle, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 w-full">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {this.props.fallbackTitle || 'Ocorreu um problema ao carregar a página'}
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {this.props.fallbackMessage ||
                this.state.error?.message ||
                'Um erro inesperado aconteceu. Tente recarregar os dados.'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recarregar página
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" /> Início
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
