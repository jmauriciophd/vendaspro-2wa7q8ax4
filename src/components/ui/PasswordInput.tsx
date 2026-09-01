import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode
  error?: boolean
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, iconLeft, error, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    // Unifica o ref externo com o interno para manter o foco ao clicar no olho
    const handleRef = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }

    const toggleVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setShowPassword((prev) => !prev)
      // Mantém o foco no input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }

    return (
      <div className="relative w-full">
        {iconLeft && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {iconLeft}
          </div>
        )}
        <input
          ref={handleRef}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={cn(
            'w-full py-2.5 bg-white text-sm text-slate-900 border rounded-xl outline-none transition-all',
            iconLeft ? 'pl-10 pr-10' : 'pl-4 pr-10',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100',
            disabled && 'bg-slate-100 cursor-not-allowed opacity-75',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={toggleVisibility}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-slate-500" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
