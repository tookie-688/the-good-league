import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { games, players } from '@/lib/db/schema'

export const outcomes = ['white_win', 'draw', 'black_win'] as const
export type Outcome = (typeof outcomes)[number]

type PlayerRecord = typeof players.$inferSelect
type GameRecord = typeof games.$inferSelect

export type TournamentData = {
  players: Array<PlayerRecord & { wins: number; draws: number; losses: number; gamesPlayed: number; winRate: number; points: number }>
  games: Array<Omit<GameRecord, 'playedAt'> & { playedAt: string; whiteName: string; blackName: string; resultLabel: string }>
  headToHead: Record<string, Record<string, { wins: number; draws: number; losses: number }>>
}

export async function loadTournament(): Promise<TournamentData> {
  const [allPlayers, allGames] = await Promise.all([
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(games).orderBy(asc(games.playedAt)),
  ])

  const stats = new Map(allPlayers.map((player) => [player.id, { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, points: 0 }]))
  const headToHead: TournamentData['headToHead'] = {}
  const names = new Map(allPlayers.map((player) => [player.id, player.name]))
  for (const player of allPlayers) headToHead[player.id] = {}

  for (const game of allGames) {
    const whiteStats = stats.get(game.whitePlayerId)
    const blackStats = stats.get(game.blackPlayerId)
    if (!whiteStats || !blackStats) continue
    const whiteId = game.whitePlayerId
    const blackId = game.blackPlayerId
    headToHead[whiteId][blackId] ??= { wins: 0, draws: 0, losses: 0 }
    headToHead[blackId][whiteId] ??= { wins: 0, draws: 0, losses: 0 }
    whiteStats.gamesPlayed += 1
    blackStats.gamesPlayed += 1

    if (game.result === 'draw') {
      whiteStats.draws += 1
      blackStats.draws += 1
      whiteStats.points += 1
      blackStats.points += 1
      headToHead[whiteId][blackId].draws += 1
      headToHead[blackId][whiteId].draws += 1
    } else if (game.result === 'white_win') {
      whiteStats.wins += 1
      blackStats.losses += 1
      whiteStats.points += 3
      headToHead[whiteId][blackId].wins += 1
      headToHead[blackId][whiteId].losses += 1
    } else {
      blackStats.wins += 1
      whiteStats.losses += 1
      blackStats.points += 3
      headToHead[blackId][whiteId].wins += 1
      headToHead[whiteId][blackId].losses += 1
    }
  }

  const rankedPlayers = allPlayers.map((player) => {
    const record = stats.get(player.id)!
    return {
      ...player,
      ...record,
      winRate: record.gamesPlayed ? Math.round((record.wins / record.gamesPlayed) * 1000) / 10 : 0,
    }
  }).sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name))

  return {
    players: rankedPlayers,
    games: allGames.map((game) => ({
      ...game,
      playedAt: game.playedAt.toISOString(),
      whiteName: names.get(game.whitePlayerId) ?? 'Removed player',
      blackName: names.get(game.blackPlayerId) ?? 'Removed player',
      resultLabel: game.result === 'draw' ? 'Draw' : game.result === 'white_win' ? 'White won' : 'Black won',
    })).reverse(),
    headToHead,
  }
}
