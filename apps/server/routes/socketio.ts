import { Server, Socket } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";

type SocketMessage =
  | { type: "subscribe"; role: "user" | "captain"; userId: string }
  | { type: "subscribe_trip"; tripId: string }
  | { type: "trip_update"; tripId: string; status: string }
  | { type: "new_trip"; trip: any }
  | { type: "ping" };

type SocketData = {
  role?: "user" | "captain";
  userId?: string;
  tripId?: string;
};

const io = new Server();
export const engine = new Engine();

io.bind(engine);

const clients = new Map<string, Set<Socket>>();
const tripSubscribers = new Map<string, Set<Socket>>();

function addClientSocket(key: string, socket: Socket) {
  if (!clients.has(key)) {
    clients.set(key, new Set());
  }
  clients.get(key)!.add(socket);
}

function addTripSubscriber(tripId: string, socket: Socket) {
  if (!tripSubscribers.has(tripId)) {
    tripSubscribers.set(tripId, new Set());
  }
  tripSubscribers.get(tripId)!.add(socket);
}

function cleanupSocket(socket: Socket) {
  const data = socket.data as SocketData;

  if (data.role && data.userId) {
    const key = `${data.role}:${data.userId}`;
    const roleClients = clients.get(key);
    if (roleClients) {
      roleClients.delete(socket);
      if (roleClients.size === 0) {
        clients.delete(key);
      }
    }
  }

  if (data.tripId) {
    const tripClients = tripSubscribers.get(data.tripId);
    if (tripClients) {
      tripClients.delete(socket);
      if (tripClients.size === 0) {
        tripSubscribers.delete(data.tripId);
      }
    }
  }
}

export function broadcastToTrip(tripId: string, message: {
  type: string;
  tripId: string;
  status?: string;
}) {
  const subscribers = tripSubscribers.get(tripId);
  if (subscribers) {
    subscribers.forEach((client) => {
      client.emit("message", message);
    });
  }
}

export function broadcastNewTrip(trip: any) {
  const captainClients = clients.get("captain");
  if (captainClients) {
    captainClients.forEach((client) => {
      client.emit("message", { type: "new_trip", trip });
    });
  }
}

function handleSocketMessage(socket: Socket, message: string | Buffer) {
  try {
    const parsed = JSON.parse(message.toString()) as SocketMessage;

    switch (parsed.type) {
      case "subscribe": {
        const { role, userId } = parsed;
        const key = `${role}:${userId}`;
        addClientSocket(key, socket);
        (socket.data as SocketData).role = role;
        (socket.data as SocketData).userId = userId;
        break;
      }

      case "subscribe_trip": {
        const { tripId } = parsed;
        addTripSubscriber(tripId, socket);
        (socket.data as SocketData).tripId = tripId;
        break;
      }

      case "trip_update": {
        const { tripId, status } = parsed;
        broadcastToTrip(tripId, { type: "trip_update", tripId, status });
        break;
      }

      case "new_trip": {
        broadcastNewTrip(parsed.trip);
        break;
      }

      case "ping": {
        socket.emit("message", { type: "pong" });
        break;
      }
    }
  } catch (err) {
    console.error("SocketIO message error:", err);
  }
}

io.on("connection", (socket) => {
  console.log("socket.io connection");
  socket.data = {} as SocketData;

  socket.on("message", (message: string | Buffer) => {
    handleSocketMessage(socket, message);
  });

  socket.on("disconnect", () => {
    cleanupSocket(socket);
  });
});
