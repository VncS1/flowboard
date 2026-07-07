export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  position: number;
  version: number;
}
