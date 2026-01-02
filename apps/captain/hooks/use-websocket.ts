import { useEffect, useRef } from "react";

type WebSocketMessage =
  | { type: "subscribe"; role: "user" | "captain"; userId: string }
  | { type: "subscribe_trip"; tripId: string }
  | { type: "trip_update"; tripId: string; status: string }
  | { type: "new_trip"; trip: any }
  | { type: "pong" };

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const subscribe = (eventType: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    return () => {
      listenersRef.current.get(eventType)!.delete(callback);
    };
  };

  const send = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;

        if (data.type === "trip_update") {
          const callbacks = listenersRef.current.get("trip_update");
          callbacks?.forEach((cb) => cb(data));
        } else if (data.type === "new_trip") {
          const callbacks = listenersRef.current.get("new_trip");
          callbacks?.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url]);

  return { send, subscribe };
}
