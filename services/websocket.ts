import { prisma } from "../lib/prisma";
import { redisService } from "../lib/redis";
import jwtLib from "jsonwebtoken";

/**
 * WebSocket Service
 * Handles real-time communication between users and captains
 */
export const websocketService = {
  /**
   * Handle WebSocket connection opening
   */
  async handleOpen(ws: any, url: URL): Promise<boolean> {
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "No token");
      return false;
    }
    
    try {
      const payload = jwtLib.verify(
        token,
        process.env.JWT_SECRET || "uber",
      ) as any;
      
      (ws as any).info = payload;
      
      if (payload.role === "user") {
        await redisService.setUserConnection(payload.user, ws);
      } else if (payload.role === "captain") {
        await redisService.setCaptainConnection(payload.user, ws);
      }
      
      console.log("🔗 WS opened for", payload.role, payload.user);
      return true;
    } catch (error) {
      ws.close(4002, "Invalid token");
      return false;
    }
  },

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws: any, msg: { type: string; payload: any }): Promise<void> {
    const { type, payload } = msg;
    
    switch (type) {
      case "listen:user":
        await this.handleUserListen(ws, payload);
        break;
      case "send:captain":
        await this.handleCaptainSend(ws, payload);
        break;
      default:
        break;
    }
  },

  /**
   * Handle user listening for trip updates
   */
  async handleUserListen(ws: any, payload: { tripId: string }): Promise<void> {
    const trip = await prisma.trip.findUnique({
      where: { id: payload.tripId },
    });
    
    if (!trip || trip.status !== "ACCEPTED" || !trip.capacity) {
      ws.send(JSON.stringify({ type: "error", payload: "Trip not found" }));
      return;
    }
    
    const captainWs = redisService.getCaptainConnection(trip.captainId!);
    if (!captainWs) {
      ws.send(
        JSON.stringify({ type: "error", payload: "Captain not connected" }),
      );
      return;
    }
    
    await redisService.setUserConnection(ws.info.user, ws);
  },

  /**
   * Handle captain sending location updates
   */
  async handleCaptainSend(ws: any, payload: { lat: number; long: number; tripId: string }): Promise<void> {
    if (
      ws.info.role !== "captain" ||
      !payload.lat ||
      !payload.long ||
      !payload.tripId
    ) {
      ws.send(JSON.stringify({ type: "error", payload: "" }));
      return;
    }
    
    // Store captain location
    await redisService.setCaptainLocation(ws.info.user, payload.lat, payload.long);
    
    // Get or fetch user ID for this trip
    let userId = await redisService.getTripUser(payload.tripId);
    
    if (!userId) {
      const trip = await prisma.trip.findUnique({
        where: { id: payload.tripId },
        include: { captain: true },
      });
      
      if (!trip) {
        ws.send(
          JSON.stringify({ type: "error", payload: "Trip not found" }),
        );
        return;
      }
      
      userId = trip.userId;
      await redisService.setTripUser(payload.tripId, userId);
    }
    
    // Send location update to user
    const userWs = redisService.getUserConnection(userId);
    if (userWs) {
      userWs.send(
        JSON.stringify({
          type: "update",
          payload: {
            status: "in_progress",
            location: { lat: payload.lat, long: payload.long },
          },
        }),
      );
    } else {
      ws.send(JSON.stringify({ type: "error", payload: "User not found" }));
    }
  },

  /**
   * Handle WebSocket connection closing
   */
  async handleClose(ws: any): Promise<void> {
    if ((ws as any).info) {
      const { user, role } = (ws as any).info;
      
      if (role === "user") {
        await redisService.deleteUserConnection(user);
      } else if (role === "captain") {
        await redisService.deleteCaptainConnection(user);
      }
    }
    
    console.log("❌ client left");
  },

  /**
   * Send trip status update to user
   */
  async sendTripStatusToUser(tripId: string, status: string): Promise<void> {
    const userId = await redisService.getTripUser(tripId);
    if (!userId) return;
    
    const userWs = redisService.getUserConnection(userId);
    if (userWs) {
      userWs.send(JSON.stringify({ type: status }));
    }
  },
};
