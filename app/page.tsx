import { loadTournament } from '@/lib/tournament'
import { TournamentDashboard } from '@/components/tournament-dashboard'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let initialData = null
  try {
    initialData = await loadTournament()
  } catch {
    initialData = null
  }
  return <TournamentDashboard initialData={initialData} />
}
