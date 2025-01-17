import { RoomAccess } from "types/RoomTypes";
import {
  type ClientMessage,
  type EditRoomInfoMessage,
  type RoomInfoMessage,
  type RoomValidityMessage,
  type TimerData,
} from "types/ClientMessageTypes";
import { generateRandomId } from "utils/generateRandomId";
import { type ServerWebSocket, randomUUIDv7 } from "bun";

type WebSocketData = {
  accessId: string;
};

interface RoomData {
  editAccessId: string;
  viewOnlyAccessId: string;
  timers: TimerData[];
  clients: Set<ServerWebSocket<WebSocketData>>;
}

const roomsMap = new Map<string, RoomData>();
// accessID => roomCode
const accessIDMap = new Map<string, string>();

const server = Bun.serve<WebSocketData>({
  fetch(req, server) {
    const success = server.upgrade(req, {
      data: {
        accessId: new URL(req.url).searchParams.get("room") ?? "",
      },
    });
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }

    // handle HTTP request normally
    return new Response("Hello world!");
  },
  websocket: {
    open(ws) {
      console.log("Opened connection", ws.data.accessId);
      if (ws.data.accessId) {
        handleSubscribe(ws, ws.data.accessId);
      }
    },
    close(ws) {
      removeClientFromAllRooms(ws);
      console.log("Closed connection");
    },
    // this is called when a message is received
    async message(ws, message) {
      try {
        const data: ClientMessage = JSON.parse(message as string);

        switch (data.type) {
          case "createRoom":
            handleCreateRoom(ws);
            break;
          case "subscribe":
            handleSubscribe(ws, data.accessId);
            break;
          case "unsubscribe":
            handleUnsubscribe(ws, data.accessId);
            break;
          case "createTimer":
            handleCreateTimer(ws, data.accessId, data.timer);
            break;
          case "updateTimer":
            handleUpdateTimer(ws, data.accessId, data.timer);
            break;
          case "deleteTimer":
            handleDeleteTimer(ws, data.accessId, data.id);
            break;
          case "roomCheck":
            handleRoomCheck(ws, data.accessId);
            break;
          default:
            console.warn("Unknown message type", data);
        }
      } catch (e) {
        console.error("Invalid message format: ", message, e);
      }
    },
  },
});

const getRoomFromAccessId = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string,
  requiresEditAccess: boolean = false
): { roomId: string; room: RoomData } | null => {
  const roomId = accessIDMap.get(accessId);

  if (!roomId) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid access ID" }));
    return null;
  }

  const room = roomsMap.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    return null;
  }

  if (requiresEditAccess && room.editAccessId !== accessId) {
    ws.send(
      JSON.stringify({ type: "error", message: "Insufficient access level" })
    );
    return null;
  }

  return { roomId, room };
};

const handleCreateRoom = (ws: ServerWebSocket<WebSocketData>) => {
  const roomId = randomUUIDv7();
  let editAccessId = generateRandomId();
  let viewOnlyAccessId = generateRandomId();

  while (accessIDMap.has(editAccessId)) {
    editAccessId = generateRandomId();
  }

  accessIDMap.set(editAccessId, roomId);

  while (accessIDMap.has(viewOnlyAccessId)) {
    viewOnlyAccessId = generateRandomId();
  }

  accessIDMap.set(viewOnlyAccessId, roomId);

  roomsMap.set(roomId, {
    viewOnlyAccessId,
    editAccessId,
    timers: [],
    clients: new Set(),
  });
  handleSubscribe(ws, editAccessId);
};

const handleSubscribe = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string
) => {
  const context = getRoomFromAccessId(ws, accessId);
  if (!context) {
    return;
  }

  const { roomId, room } = context;

  const accessLevel =
    room.editAccessId === accessId ? RoomAccess.EDIT : RoomAccess.VIEW_ONLY;
  room.clients.add(ws);

  ws.subscribe(roomId);

  const roomInfo: RoomInfoMessage = {
    type: "roomInfo",
    accessLevel,
    viewAccessId: room.viewOnlyAccessId,
  };

  if (accessLevel === RoomAccess.EDIT) {
    (roomInfo as EditRoomInfoMessage).editAccessId = room.editAccessId;
  }

  ws.send(JSON.stringify(roomInfo));

  // Send the current state of the room to the client
  ws.send(
    JSON.stringify({
      type: "roomUpdate",
      timers: roomsMap.get(roomId)!.timers,
    })
  );
};

const handleUnsubscribe = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string
) => {
  const context = getRoomFromAccessId(ws, accessId);
  if (!context) {
    return;
  }

  const { roomId, room } = context;

  ws.unsubscribe(roomId);
  room.clients.delete(ws);

  ws.send(JSON.stringify({ type: "unsubscribeSuccess" }));
};

const handleCreateTimer = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string,
  timer: TimerData
) => {
  const context = getRoomFromAccessId(ws, accessId, true);
  if (!context) {
    return;
  }

  const { roomId, room } = context;

  room.timers.push(timer);
  server.publish(
    roomId,
    JSON.stringify({
      type: "roomUpdate",
      timers: room.timers,
    })
  );
};

const handleUpdateTimer = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string,
  timer: TimerData
) => {
  const context = getRoomFromAccessId(ws, accessId, true);
  if (!context) {
    return;
  }

  const { roomId, room } = context;

  const existingTimer = room.timers.find((t) => t.id === timer.id);
  if (!existingTimer) {
    ws.send(JSON.stringify({ type: "error", message: "Timer not found" }));
    return;
  }

  Object.assign(existingTimer, timer);
  server.publish(
    roomId,
    JSON.stringify({
      type: "roomUpdate",
      timers: room.timers,
    })
  );
};

const handleDeleteTimer = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string,
  timerId: string
) => {
  const context = getRoomFromAccessId(ws, accessId, true);
  if (!context) {
    return;
  }

  const { roomId, room } = context;

  const idx = room.timers.findIndex((timer) => timer.id === timerId);
  if (idx === -1) {
    ws.send(JSON.stringify({ type: "error", message: "Timer not found" }));
    return;
  }

  room.timers.splice(idx, 1);
  server.publish(
    roomId,
    JSON.stringify({
      type: "roomUpdate",
      timers: room.timers,
    })
  );
};

const handleRoomCheck = (
  ws: ServerWebSocket<WebSocketData>,
  accessId: string
) => {
  const roomId = accessIDMap.get(accessId);
  const room = roomsMap.get(roomId ?? "");
  if (!roomId || !room) {
    ws.send(
      JSON.stringify({
        type: "roomValidity",
        valid: false,
      } as RoomValidityMessage)
    );

    return;
  }

  ws.send(
    JSON.stringify({
      type: "roomValidity",
      valid: true,
    } as RoomValidityMessage)
  );
};

const removeClientFromAllRooms = (ws: ServerWebSocket<WebSocketData>) => {
  for (const [roomId, room] of roomsMap.entries()) {
    ws.unsubscribe(roomId);
    room.clients.delete(ws);
  }
};

console.log(`Listening on ${server.hostname}:${server.port}`);
