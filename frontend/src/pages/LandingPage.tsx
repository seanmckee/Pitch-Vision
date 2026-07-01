import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Crosshair, Layers3 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { PageBrand, PageShell } from '../components/PageShell'

const FEATURES = [
  {
    icon: Crosshair,
    title: 'Strike zone map',
    description: 'Every pitch plotted by location, colored by outcome.',
  },
  {
    icon: Layers3,
    title: 'Arsenal breakdown',
    description: 'Usage, velocity, spin, and movement by pitch type.',
  },
  {
    icon: CalendarDays,
    title: 'Game-by-game',
    description: 'Pick a start, filter by inning or at-bat, replay pitch-by-pitch.',
  },
] as const

export default function LandingPage() {
  return (
    <PageShell mainClassName="mx-auto w-full max-w-3xl justify-center px-6 py-16">
      <PageBrand />

      <h1 className="mt-10 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Explore any pitcher&apos;s game, pitch by pitch.
      </h1>

      <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-400">
        Search an MLB pitcher, pick a start from their recent schedule, and dig into
        real Statcast data — location, arsenal, and a full pitch-by-pitch walkthrough.
      </p>

      <ul className="mt-12 space-y-5">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <Icon className="size-5 text-emerald-400" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-gray-100">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-14">
        <Button asChild size="lg" className="h-11 gap-2 px-6 text-base">
          <Link to="/app">
            Open the app
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-gray-500">
          Try searching &ldquo;Gerrit Cole&rdquo; or &ldquo;Shohei Ohtani&rdquo; once you&apos;re in.
        </p>
      </div>
    </PageShell>
  )
}
