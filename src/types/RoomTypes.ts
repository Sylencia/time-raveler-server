export enum RoomAccess {
  VIEW_ONLY = 'viewonly',
  EDIT = 'edit',
  NONE = 'none',
}

export type RoomMode = RoomAccess.EDIT | RoomAccess.VIEW_ONLY | RoomAccess.NONE;
