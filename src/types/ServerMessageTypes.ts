import type { RoomMode } from "types/RoomTypes";

export interface ViewOnlyRoomInfoMessage {
  type: "roomInfo";
  accessLevel: RoomMode;
  viewAccessId: string;
}

export interface UnsubscribeSuccess {
  type: "unsubscribeSuccess";
}

export interface RoomValidityMessage {
  type: "roomValidity";
  valid: boolean;
}

export interface EditRoomInfoMessage extends ViewOnlyRoomInfoMessage {
  editAccessId: string;
}

export type RoomInfoMessage = ViewOnlyRoomInfoMessage | EditRoomInfoMessage;
