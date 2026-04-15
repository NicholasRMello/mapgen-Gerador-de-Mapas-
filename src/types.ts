export type RoomType = 'start' | 'end' | 'normal' | 'boss';

export interface Point {
  x: number;
  y: number;
}

export interface UserAsset {
  id: number;
  name: string;
  dataURL: string;
  img: HTMLImageElement;
  type: 'any' | RoomType;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assetKey: string | null;
  userAsset: UserAsset | null;
  type: RoomType;
  connections: number[];
}

export interface Corridor {
  fromRoomId: number;
  toRoomId: number;
  points: Point[];
  width: number;
}

export interface GeneratedMap {
  seed: string;
  width: number;
  height: number;
  rooms: Room[];
  corridors: Corridor[];
}

export interface Pin {
  id: number;
  x: number;
  y: number;
  label: string;
  note: string;
  completed: boolean;
}
