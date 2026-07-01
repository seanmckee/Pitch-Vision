import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const panelClass = 'rounded-lg border border-white/10 bg-white/5'

interface PageShellProps {
  children: ReactNode
  mainClassName?: string
}

export function PageShell({ children, mainClassName }: PageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.08),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-1/4 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl"
        aria-hidden
      />

      <main className={cn('relative z-10 flex flex-1 flex-col', mainClassName)}>{children}</main>

      <footer className="relative z-10 border-t border-white/5 px-6 py-5 text-center text-xs text-gray-600">
        Data from MLB Statcast via Baseball Savant
      </footer>
    </div>
  )
}

export function PageBrand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/pitch-vision-favicon.svg"
        alt=""
        className="size-11 rounded-xl"
        aria-hidden
      />
      <span className="text-sm font-medium tracking-wide text-gray-400 uppercase">
        Pitch Vision
      </span>
    </div>
  )
}
