'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Activity, ArrowUpRight, Crown, Download, Plus, Swords, Trash2, Users, X } from 'lucide-react'
import type { TournamentData } from '@/lib/tournament'

type Props = { initialData: TournamentData | null }
const fetcher = async (url: string): Promise<TournamentData> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load tournament data')
  return response.json()
}

export function TournamentDashboard({ initialData }: Props) {
  const { data, error, mutate, isLoading } = useSWR<TournamentData>('/api/tournament', fetcher, { fallbackData: initialData ?? undefined, revalidateOnFocus: true })
  const [modal, setModal] = useState<'player' | 'game' | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<'standings' | 'head-to-head' | 'games'>('standings')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [newName, setNewName] = useState('')
  const [whitePlayerId, setWhitePlayerId] = useState('')
  const [blackPlayerId, setBlackPlayerId] = useState('')
  const [result, setResult] = useState<'white_win' | 'draw' | 'black_win'>('white_win')
  const players = data?.players ?? []
  const games = data?.games ?? []
  const leader = players[0]
  const playedCount = games.length
  const avgWinRate = players.length ? Math.round(players.reduce((sum, player) => sum + player.winRate, 0) / players.length) : 0
  const mostActive = useMemo(() => [...players].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0], [players])

  async function submitAction(payload: Record<string, string>) {
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/tournament', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error ?? 'Could not save the update.')
      await mutate(responseData, { revalidate: false })
      setModal(null)
      setNewName('')
      setNotice('Tournament updated.')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not save the update.')
    } finally {
      setBusy(false)
    }
  }

  async function removePlayer(id: string, name: string) {
    if (!window.confirm(`Remove ${name} and all of their recorded games?`)) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch(`/api/tournament?playerId=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error ?? 'Could not remove player.')
      await mutate(responseData, { revalidate: false })
      setNotice(`${name} and their game history were removed.`)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not remove player.')
    } finally {
      setBusy(false)
    }
  }

  async function removeGame(id: string) {
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/tournament', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-game', id }) })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error ?? 'Could not remove game.')
      await mutate(responseData, { revalidate: false })
      setNotice('Game result removed and standings recalculated.')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not remove game.')
    } finally {
      setBusy(false)
    }
  }

  function openGameModal() {
    setWhitePlayerId(players[0]?.id ?? '')
    setBlackPlayerId(players[1]?.id ?? '')
    setModal('game')
  }

  function exportStandings() {
    const rows = [['Rank', 'Player', 'Wins', 'Draws', 'Losses', 'Games', 'Win rate', 'Points'], ...players.map((player, index) => [String(index + 1), player.name, String(player.wins), String(player.draws), String(player.losses), String(player.gamesPlayed), `${player.winRate}%`, String(player.points)])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'chess-tournament-standings.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const names = new Map(players.map((player) => [player.id, player.name]))

  return (
    <main className="tournament-shell">
      <div className="topline"><a className="brand" href="#top" aria-label="The Clubhouse home"><span className="brand-mark"><Crown size={19} strokeWidth={1.6} /></span><span>THE CLUBHOUSE</span></a><div className="season-pill"><span className="live-dot" /> THE GOOD LEAGUE <span className="season-divider">/</span> SEASON 01</div><a className="top-link" href="#standings">Tournament desk <span aria-hidden="true">↗</span></a></div>
      <div className="page-wrap" id="top">
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD LEAGUE</div><h1>Every move<br />counts<span className="hero-period">.</span></h1><p className="hero-description">One table. Every game. A season worth remembering.</p><div className="hero-actions"><button className="button-primary" onClick={openGameModal} disabled={players.length < 2}><Plus size={16} /> Record a game</button><button className="button-secondary" onClick={() => setModal('player')}><Users size={16} /> Add a player</button></div><div className="hero-footnote"><span className="piece-dot"><Crown size={12} /></span> <span>Scoring: 3 points for a win · 1 for a draw</span></div></div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><img className="hero-chess" src="/chess-knight.png" alt="" /><div className="art-label art-label-top">EST. THIS SEASON</div><div className="art-label art-label-bottom">PLAY WELL. PLAY OFTEN.</div><div className="coordinate coordinate-a">A</div><div className="coordinate coordinate-h">H</div></div>
        </section>

        <section className="stat-strip" aria-label="Tournament summary"><div className="summary-stat"><div className="summary-icon"><Users size={17} /></div><div><span className="stat-label">PLAYERS</span><strong>{String(players.length).padStart(2, '0')}</strong></div></div><div className="summary-stat"><div className="summary-icon"><Swords size={17} /></div><div><span className="stat-label">GAMES PLAYED</span><strong>{String(playedCount).padStart(2, '0')}</strong></div></div><div className="summary-stat"><div className="summary-icon"><Activity size={17} /></div><div><span className="stat-label">AVG. WIN RATE</span><strong>{avgWinRate}<small>%</small></strong></div></div><div className="summary-stat summary-leader"><div className="summary-icon leader-icon"><Crown size={17} /></div><div><span className="stat-label">CURRENT LEADER</span><strong className="leader-name">{leader?.name ?? '—'}</strong></div></div></section>

        <section className="content-section" id="standings">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE SEASON SO FAR</div><h2>League table<span className="hero-period">.</span></h2></div><button className="export-button" onClick={exportStandings}><Download size={15} /> <span>Export standings</span></button></div>
          <div className="tabs" role="tablist" aria-label="Tournament views"><button role="tab" aria-selected={activeTab === 'standings'} className={activeTab === 'standings' ? 'tab active' : 'tab'} onClick={() => setActiveTab('standings')}>Standings</button><button role="tab" aria-selected={activeTab === 'head-to-head'} className={activeTab === 'head-to-head' ? 'tab active' : 'tab'} onClick={() => setActiveTab('head-to-head')}>Head to head</button><button role="tab" aria-selected={activeTab === 'games'} className={activeTab === 'games' ? 'tab active' : 'tab'} onClick={() => setActiveTab('games')}>Games <span className="tab-count">{playedCount}</span></button></div>
          {notice && <p className="notice" role="status">{notice}</p>}
          {error && <p className="notice error-notice" role="alert">Could not refresh live tournament data. Please try again.</p>}
          {isLoading && !data ? <div className="empty-state">Loading tournament…</div> : activeTab === 'standings' ? <StandingsTable players={players} onRemove={removePlayer} onAdd={() => setModal('player')} /> : activeTab === 'head-to-head' ? <HeadToHead players={players} matrix={data?.headToHead ?? {}} selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} /> : <GamesList games={games} onRemove={removeGame} />}
        </section>

        <section className="lower-grid"><div className="spotlight-card"><div className="spotlight-head"><span className="spotlight-tag"><Crown size={13} /> PLAYER TO WATCH</span><span className="spotlight-season">SEASON 01</span></div><div className="spotlight-body"><div className="spotlight-avatar">{leader?.name?.slice(0, 1).toUpperCase() ?? <Crown size={21} />}</div><div className="spotlight-copy"><div className="spotlight-name">{leader?.name ?? 'The board is yours'}</div><div className="spotlight-caption">{leader ? 'Top of the table right now' : 'Add a player to get started'}</div></div><div className="spotlight-points"><strong>{leader?.points ?? 0}</strong><span>PTS</span></div></div><div className="spotlight-foot"><span>Win rate <strong>{leader?.winRate ?? 0}%</strong></span><span>Record <strong>{leader?.wins ?? 0}W · {leader?.draws ?? 0}D · {leader?.losses ?? 0}L</strong></span></div></div><div className="activity-card"><div className="activity-heading"><span className="eyebrow"><span className="eyebrow-line" /> IN THE CLUB</span><span className="activity-mark"><Swords size={20} /></span></div><h3>Good games,<br /><em>good company.</em></h3><p>{mostActive ? `${mostActive.name} is setting the pace with ${mostActive.gamesPlayed} game${mostActive.gamesPlayed === 1 ? '' : 's'} played.` : 'Every tournament starts with an opening move.'}</p><button className="text-action" onClick={openGameModal} disabled={players.length < 2}>Log the next game <span aria-hidden="true">→</span></button></div></section>
        <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Crown size={19} strokeWidth={1.6} /></span><span>THE CLUBHOUSE</span></a><span>Made for the love of the game.</span><a href="#standings" className="back-top">BACK TO TOP ↑</a></footer>
      </div>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={18} /></button><div className="eyebrow"><span className="eyebrow-line" /> {modal === 'player' ? 'GROW THE LEAGUE' : 'ADD TO THE RECORD'}</div><h2 id="modal-title">{modal === 'player' ? 'New player.' : 'Record a game.'}</h2>{modal === 'player' ? <form onSubmit={(event) => { event.preventDefault(); void submitAction({ action: 'add-player', name: newName }) }}><label htmlFor="player-name">Player name</label><input id="player-name" autoFocus maxLength={48} placeholder="e.g. Alex Morgan" value={newName} onChange={(event) => setNewName(event.target.value)} required /><button className="button-primary modal-submit" disabled={busy}>{busy ? 'Adding…' : 'Add player'} <ArrowUpRight size={15} /></button></form> : players.length < 2 ? <p className="modal-hint">Add at least two players before recording a game.</p> : <form onSubmit={(event) => { event.preventDefault(); void submitAction({ action: 'add-game', whitePlayerId, blackPlayerId, result }) }}><div className="form-row"><div><label htmlFor="white-player">White</label><select id="white-player" value={whitePlayerId} onChange={(event) => setWhitePlayerId(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></div><div><label htmlFor="black-player">Black</label><select id="black-player" value={blackPlayerId} onChange={(event) => setBlackPlayerId(event.target.value)}>{players.filter((player) => player.id !== whitePlayerId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></div></div><label htmlFor="game-result">Result</label><select id="game-result" value={result} onChange={(event) => setResult(event.target.value as typeof result)}><option value="white_win">{names.get(whitePlayerId) ?? 'White'} wins</option><option value="draw">Draw</option><option value="black_win">{names.get(blackPlayerId) ?? 'Black'} wins</option></select><p className="modal-hint">This result will update both players&apos; records and their head-to-head score.</p><button className="button-primary modal-submit" disabled={busy || whitePlayerId === blackPlayerId}>{busy ? 'Saving…' : 'Save result'} <ArrowUpRight size={15} /></button></form>}</section></div>}
    </main>
  )
}

function StandingsTable({ players, onRemove, onAdd }: { players: TournamentData['players']; onRemove: (id: string, name: string) => void; onAdd: () => void }) {
  if (!players.length) return <div className="empty-state"><div className="empty-piece"><Crown size={32} /></div><h3>Your first move starts here.</h3><p>Add your friends to open the leaderboard.</p><button className="button-primary" onClick={onAdd}><Plus size={16} /> Add your first player</button></div>
  return <div className="table-frame"><div className="table-scroll"><table className="standings-table"><thead><tr><th className="rank-head">#</th><th>PLAYER</th><th>W</th><th>D</th><th>L</th><th>PLAYED</th><th>WIN RATE</th><th>POINTS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{players.map((player, index) => <tr key={player.id} className={index === 0 ? 'leader-row' : ''}><td className="rank-cell">{index === 0 ? <span className="rank-crown"><Crown size={14} /></span> : String(index + 1).padStart(2, '0')}</td><td><div className="player-cell"><span className={`player-initial ${index === 0 ? 'top-initial' : ''}`}>{player.name.slice(0, 1).toUpperCase()}</span><span className="player-name">{player.name}</span>{index === 0 && <span className="leader-badge">LEADER</span>}</div></td><td className="record-number wins">{player.wins}</td><td className="record-number">{player.draws}</td><td className="record-number losses">{player.losses}</td><td className="played-number">{player.gamesPlayed}</td><td><div className="rate-cell"><span>{player.winRate}%</span><span className="rate-track"><i style={{ width: `${player.winRate}%` }} /></span></div></td><td className="points-cell">{player.points}<span> pts</span></td><td><button className="icon-button" title={`Remove ${player.name}`} aria-label={`Remove ${player.name}`} onClick={() => onRemove(player.id, player.name)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>RANKED BY POINTS <span className="footer-dot">·</span> WINS AS TIEBREAKER</span><span>WIN RATE = WINS ÷ GAMES</span></div></div>
}

function HeadToHead({ players, matrix, selectedPlayer, setSelectedPlayer }: { players: TournamentData['players']; matrix: TournamentData['headToHead']; selectedPlayer: string; setSelectedPlayer: (id: string) => void }) {
  const focalPlayer = players.find((player) => player.id === selectedPlayer) ?? players[0]
  if (players.length < 2) return <div className="empty-state"><div className="empty-piece"><Crown size={32} /></div><h3>Head-to-head starts with two.</h3><p>Add another player and log a game to build the rivalry record.</p></div>
  return <div className="h2h-card"><div className="h2h-intro"><div><span className="eyebrow"><span className="eyebrow-line" /> THE RIVALRY BOARD</span><h3>Head to head</h3><p>Wins · draws · losses, from each player&apos;s perspective.</p></div><label className="sr-only" htmlFor="rivalry-player">Choose a player</label><select id="rivalry-player" className="rivalry-select" value={focalPlayer.id} onChange={(event) => setSelectedPlayer(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></div><div className="rivalry-list">{players.filter((player) => player.id !== focalPlayer.id).map((opponent) => { const record = matrix[focalPlayer.id]?.[opponent.id] ?? { wins: 0, draws: 0, losses: 0 }; return <div className="rivalry-row" key={opponent.id}><div className="rivalry-player"><span className="player-initial">{opponent.name.slice(0, 1).toUpperCase()}</span><span>{opponent.name}</span></div><div className="scoreline"><span className="rival-win">{record.wins}</span><span className="score-dash">—</span><span className="rival-draw">{record.draws}</span><span className="score-dash">—</span><span className="rival-loss">{record.losses}</span></div><div className="score-legend"><span>W</span><span>D</span><span>L</span></div></div>})}</div><div className="score-key"><span><i className="key-win" /> {focalPlayer.name} wins</span><span><i className="key-draw" /> Draws</span><span><i className="key-loss" /> {focalPlayer.name} losses</span></div></div>
}

function GamesList({ games, onRemove }: { games: TournamentData['games']; onRemove: (id: string) => void }) {
  if (!games.length) return <div className="empty-state"><div className="empty-piece"><Crown size={32} /></div><h3>No games on the scoresheet.</h3><p>Once you log a game, every result will live here.</p></div>
  return <div className="games-list">{games.map((game, index) => <article className="game-row" key={game.id}><div className="game-number">{String(games.length - index).padStart(2, '0')}</div><div className="game-players"><span>{game.whiteName}</span><span className="versus">vs</span><span>{game.blackName}</span></div><div className="game-result"><span className={game.result === 'draw' ? 'result-draw' : 'result-winner'}>{game.result === 'white_win' ? game.whiteName : game.result === 'black_win' ? game.blackName : 'Draw'}</span><span className="result-caption">{game.resultLabel}</span></div><time className="game-date" dateTime={new Date(game.playedAt).toISOString()}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(game.playedAt))}</time><button className="icon-button" title="Remove game result" aria-label={`Remove game ${game.whiteName} versus ${game.blackName}`} onClick={() => onRemove(game.id)}><Trash2 size={15} /></button></article>)}</div>
}
