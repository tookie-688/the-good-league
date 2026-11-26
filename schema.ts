import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const players = pgTable('chess_players', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const games = pgTable('chess_games', {
  id: text('id').primaryKey(),
  whitePlayerId: text('white_player_id').notNull(),
  blackPlayerId: text('black_player_id').notNull(),
  result: text('result').notNull(),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
})
