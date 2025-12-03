import { prisma } from "../lib/prisma";
import { websocketService } from "./websocket";
import { redisService } from "../lib/redis";

/**
 * Trip Service
 * Handles business logic for trip operations
 */
export const tripService = {
  /**
   * Match a trip with a captain
   */
  async matchTrip(tripId: string, captainId: string): Promise<{ success: boolean; message: string; tripid?: string }> {
    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
    });
    
    if (!captain) {
      return { success: false, message: "Captain not found" };
    }
    
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    
    if (!trip) {
      return { success: false, message: "Trip not found!" };
    }
    
    if (trip.status !== "REQUESTED") {
      return { success: false, message: "Trip is not available for matching" };
    }
    
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: "ACCEPTED",
        captain: { connect: { id: captain.id } },
      },
    });
    
    return { success: true, message: "Trip matched successfully!", tripid: trip.id };
  },

  /**
   * Cancel a trip
   */
  async cancelTrip(tripId: string, userId: string, role: string): Promise<{ success: boolean; message: string }> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    
    if (!trip) {
      return { success: false, message: "Trip not found!" };
    }
    
    // Check authorization
    if (role === "captain" && trip.captainId !== userId) {
      return { success: false, message: "Unauthorized" };
    } else if (role === "user" && trip.userId !== userId) {
      return { success: false, message: "Unauthorized" };
    }
    
    // Check if ride has already started (users can't cancel after captain accepts)
    if (role === "user" && trip.status === "ACCEPTED") {
      return { success: false, message: "Ride has already started!" };
    }
    
    // Update trip status
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CANCELLED" },
    });
    
    // Notify user via WebSocket
    await websocketService.sendTripStatusToUser(trip.id, "CANCELLED");
    
    return { success: true, message: "Trip cancelled successfully!" };
  },

  /**
   * Mark trip as picked up (captain has arrived and verified OTP)
   */
  async pickupTrip(tripId: string, captainId: string, otp: string): Promise<{ success: boolean; message: string }> {
    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
    });
    
    if (!captain) {
      return { success: false, message: "Captain not found" };
    }
    
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    
    if (!trip || trip.captainId !== captain.id || trip.status !== "ACCEPTED" || trip.otp !== otp) {
      return { success: false, message: "Invalid trip or OTP!" };
    }
    
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "ON_TRIP" },
    });
    
    // Store trip-user mapping for real-time updates
    await redisService.setTripUser(trip.id, trip.userId);
    
    // Notify user via WebSocket
    await websocketService.sendTripStatusToUser(trip.id, "ON_TRIP");
    
    return { success: true, message: "Trip picked up successfully!" };
  },

  /**
   * Mark trip as completed
   */
  async completeTrip(tripId: string, captainId: string): Promise<{ success: boolean; message: string }> {
    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
    });
    
    if (!captain) {
      return { success: false, message: "Captain not found" };
    }
    
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    
    if (!trip || trip.captainId !== captain.id || trip.status !== "ON_TRIP") {
      return { success: false, message: "Invalid trip!" };
    }
    
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });
    
    // Notify user via WebSocket
    await websocketService.sendTripStatusToUser(trip.id, "COMPLETED");
    
    // Clean up trip-user mapping
    await redisService.deleteTripUser(trip.id);
    
    return { success: true, message: "Trip completed successfully!" };
  },
};
