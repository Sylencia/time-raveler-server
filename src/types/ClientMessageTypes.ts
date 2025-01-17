export * from "./RoomTypes";
export * from "./ServerMessageTypes";
export interface CreateRoomMessage {
  type: "createRoom";
}

export interface SubscribeMessage {
  type: "subscribe";
  accessId: string;
}

export interface UnsubscribeMessage {
  type: "unsubscribe";
  accessId: string;
}

export interface CreateTimerMessage {
  type: "createTimer";
  accessId: string;
  timer: TimerData;
}

export interface DeleteTimerMessage {
  type: "deleteTimer";
  accessId: string;
  id: string;
}

export interface UpdateTimerMessage {
  type: "updateTimer";
  accessId: string;
  timer: TimerData;
}

export interface RoomCheckMessage {
  type: "roomCheck";
  accessId: string;
}

export type ClientMessage =
  | CreateRoomMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | CreateTimerMessage
  | DeleteTimerMessage
  | UpdateTimerMessage
  | RoomCheckMessage;

export type TimerData = {
  id: string;
  endTime: number;
  timeRemaining: number;
  running: boolean;
  eventName: string;
  rounds: number;
  roundTime: number;
  hasDraft: boolean;
  draftTime: number;
  currentRoundNumber: number;
  currentRoundLength: number;
};
