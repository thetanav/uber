import { ServerWebSocket } from "bun";

type WebSocketMessage =
  | { type: "subscribe"; role: "user" | "captain"; userId: string }
  | { type: "subscribe_trip"; tripId: string }
  | { type: "trip_update"; tripId: string; status: string }
  | { type: "new_trip"; trip: any }
  | { type: "ping" };

type WebSocketData = {
  role?: string;
  userId?: string;
  tripId?: string;
};

const clients = new Map<string, Set<ServerWebSocket<WebSocketData>>>();
const tripSubscribers = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

export function handleWebSocket(ws: ServerWebSocket<WebSocketData>) {
  console.log("New WebSocket connection");
  ws.data = {};
}

export function handleMessage(
  ws: ServerWebSocket<WebSocketData>,
  message: string | Buffer,
) {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;

    switch (data.type) {
      case "subscribe": {
        const { role, userId } = data;
        const key = `${role}:${userId}`;

        if (!clients.has(key)) {
          clients.set(key, new Set());
        }
        clients.get(key)!.add(ws);

        ws.data.role = role;
        ws.data.userId = userId;

        console.log(`${role} ${userId} subscribed`);
        break;
      }

      case "subscribe_trip": {
        const { tripId } = data;
        if (!tripSubscribers.has(tripId)) {
          tripSubscribers.set(tripId, new Set());
        }
        tripSubscribers.get(tripId)!.add(ws);

        ws.data.tripId = tripId;

        console.log(`Client subscribed to trip ${tripId}`);
        break;
      }

      case "trip_update": {
        const { tripId, status } = data;
        broadcastToTrip(tripId, { type: "trip_update", tripId, status });
        break;
      }

      case "new_trip": {
        const { trip } = data;
        broadcastNewTrip(trip);
        break;
      }

      case "ping": {
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      }
    }
  } catch (err) {
    console.error("WebSocket message error:", err);
  }
}

export function handleClose(ws: ServerWebSocket<WebSocketData>) {
  console.log("WebSocket connection closed");

  if (ws.data.role && ws.data.userId) {
    const key = `${ws.data.role}:${ws.data.userId}`;
    const roleClients = clients.get(key);
    if (roleClients) {
      roleClients.delete(ws);
      if (roleClients.size === 0) {
        clients.delete(key);
      }
    }
  }

  if (ws.data.tripId) {
    const tripClients = tripSubscribers.get(ws.data.tripId);
    if (tripClients) {
      tripClients.delete(ws);
      if (tripClients.size === 0) {
        tripSubscribers.delete(ws.data.tripId);
      }
    }
  }
}

export function broadcastToTrip(
  tripId: string,
  message: { type: string; tripId: string; status?: string },
) {
  const subscribers = tripSubscribers.get(tripId);
  if (subscribers) {
    const data = JSON.stringify(message);
    subscribers.forEach((ws) => {
      try {
        ws.send(data);
      } catch (err) {
        console.error("Failed to send to subscriber:", err);
      }
    });
    console.log(
      `Broadcasted to ${subscribers.size} subscribers of trip ${tripId}`,
    );
  }
}

export function broadcastNewTrip(trip: any) {
  const captainClients = clients.get("captain");

  if (captainClients) {
    const message = JSON.stringify({ type: "new_trip", trip });
    captainClients.forEach((ws) => {
      try {
        ws.send(message);
      } catch (err) {
        console.error("Failed to send to captain:", err);
      }
    });
    console.log(`Broadcasted new trip to ${captainClients.size} captains`);
  }
}

export function getUserSockets(userId: string) {
  return clients.get(`user:${userId}`);
}

export function getCaptainSockets(captainId: string) {
  return clients.get(`captain:${captainId}`);
}
