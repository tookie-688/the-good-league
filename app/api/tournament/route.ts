import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { games, players } from '@/lib/db/schema'
import { loadTournament, outcomes, type Outcome } from '@/lib/tournament'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await loadTournament())
  } catch {
    return NextResponse.json({ error: 'Tournament data is temporarily unavailable.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.action === 'add-player') {
      const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
      if (!name || name.length > 48) return NextResponse.json({ error: 'Enter a player name (up to 48 characters).' }, { status: 400 })
      const existing = await db.select({ name: players.name }).from(players)
      if (existing.length >= 64) return NextResponse.json({ error: 'This tournament has reached the 64-player limit.' }, { status: 400 })
      if (existing.some((player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return NextResponse.json({ error: 'A player with that name already exists.' }, { status: 409 })
      await db.insert(players).values({ id: randomUUID(), name })
      return NextResponse.json(await loadTournament(), { status: 201 })
    }

    if (body.action === 'add-game') {
      const { whitePlayerId, blackPlayerId, result } = body
      if (typeof whitePlayerId !== 'string' || typeof blackPlayerId !== 'string' || whitePlayerId === blackPlayerId || !outcomes.includes(result)) {
        return NextResponse.json({ error: 'Choose two different players and a valid result.' }, { status: 400 })
      }
      const selected = await db.select({ id: players.id }).from(players)
      const selectedIds = new Set(selected.map((player) => player.id))
      if (!selectedIds.has(whitePlayerId) || !selectedIds.has(blackPlayerId)) return NextResponse.json({ error: 'One of those players is no longer in this tournament.' }, { status: 400 })
      await db.insert(games).values({ id: randomUUID(), whitePlayerId, blackPlayerId, result: result as Outcome })
      return NextResponse.json(await loadTournament(), { status: 201 })
    }

    if (body.action === 'delete-game') {
      if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid game.' }, { status: 400 })
      await db.delete(games).where(eq(games.id, body.id))
      return NextResponse.json(await loadTournament())
    }

    return NextResponse.json({ error: 'Unknown tournament action.' }, { status: 400 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'A player with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save that tournament update.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('playerId')
    if (!id) return NextResponse.json({ error: 'Choose a player to remove.' }, { status: 400 })
    await db.delete(players).where(eq(players.id, id))
    return NextResponse.json(await loadTournament())
  } catch {
    return NextResponse.json({ error: 'Could not remove that player.' }, { status: 500 })
  }
}
