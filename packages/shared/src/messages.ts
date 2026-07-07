import { z } from "zod";

const boardSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  ownerId: z.string(),
});

const columnSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().min(1),
  position: z.number().int().nonnegative(),
});

const cardSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  columnId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  position: z.number().int().nonnegative(),
  version: z.number().int().min(1),
});

export const cardMoveMessageSchema = z.object({
  type: z.literal("card:move"),
  cardId: z.string(),
  toColumnId: z.string(),
  toPosition: z.number().int().nonnegative(),
  version: z.number().int().min(1),
});

export const cardCreateMessageSchema = z.object({
  type: z.literal("card:create"),
  boardId: z.string(),
  columnId: z.string(),
  title: z.string().min(1),
  position: z.number().int().nonnegative(),
});

export const cardUpdateMessageSchema = z.object({
  type: z.literal("card:update"),
  cardId: z.string(),
  version: z.number().int().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const cardDeleteMessageSchema = z.object({
  type: z.literal("card:delete"),
  cardId: z.string(),
  version: z.number().int().min(1),
});

export const boardSyncMessageSchema = z.object({
  type: z.literal("board:sync"),
  board: boardSchema,
  columns: z.array(columnSchema),
  cards: z.array(cardSchema),
});

export const cardConflictMessageSchema = z.object({
  type: z.literal("card:conflict"),
  cardId: z.string(),
  reason: z.enum(["stale-version"]),
  card: cardSchema,
});

export const clientToServerMessageSchema = z.discriminatedUnion("type", [
  cardMoveMessageSchema,
  cardCreateMessageSchema,
  cardUpdateMessageSchema,
  cardDeleteMessageSchema,
]);

export const serverToClientMessageSchema = z.discriminatedUnion("type", [
  boardSyncMessageSchema,
  cardConflictMessageSchema,
]);

export type CardMoveMessage = z.infer<typeof cardMoveMessageSchema>;
export type CardCreateMessage = z.infer<typeof cardCreateMessageSchema>;
export type CardUpdateMessage = z.infer<typeof cardUpdateMessageSchema>;
export type CardDeleteMessage = z.infer<typeof cardDeleteMessageSchema>;
export type BoardSyncMessage = z.infer<typeof boardSyncMessageSchema>;
export type CardConflictMessage = z.infer<typeof cardConflictMessageSchema>;
export type ClientToServerMessage = z.infer<typeof clientToServerMessageSchema>;
export type ServerToClientMessage = z.infer<typeof serverToClientMessageSchema>;
