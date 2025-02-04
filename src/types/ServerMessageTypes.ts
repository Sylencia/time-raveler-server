import type { RoomMode } from 'types/RoomTypes';
import type { TimerData } from './ClientMessageTypes';

export interface ViewOnlyRoomInfoMessage {
  type: 'roomInfo';
  accessLevel: RoomMode;
  viewAccessId: string;
}

export interface UnsubscribeSuccessMessage {
  type: 'unsubscribeSuccess';
}

export interface RoomValidityMessage {
  type: 'roomValidity';
  valid: boolean;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface RoomUpdateMessage {
  type: 'roomUpdate';
  timers: TimerData[];
}

export interface TimerUpdateMessage {
  type: 'timerUpdate';
  timer: TimerData;
}

export interface TimerCreatedMessage {
  type: 'timerCreated';
  timer: TimerData;
}

export interface TimerDeletedMessage {
  type: 'timerDeleted';
  id: string;
}

export interface EditRoomInfoMessage extends ViewOnlyRoomInfoMessage {
  editAccessId: string;
}

export type RoomInfoMessage = ViewOnlyRoomInfoMessage | EditRoomInfoMessage;
