import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/index";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = "uber";

const generateToken = (payload: any) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

vi.mock("../lib/prisma", () => ({
  prisma: {
    captain: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

import { prisma } from "../lib/prisma";

describe("Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Request Trip", () => {
    it("should create trip successfully", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);
      prisma.user.findUnique.mockResolvedValue({ id: "user-id" });
      prisma.trip.create.mockResolvedValue({ id: "trip-id" });

      const response = await app.handle(
        new Request("http://localhost/trip/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({
            origin: { name: "Origin", latitude: 1.0, longitude: 1.0 },
            destination: { name: "Destination", latitude: 2.0, longitude: 2.0 },
            capacity: 4,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip created successfully!");
      expect(body.id).toBe("trip-id");
      expect(body.otp).toBeDefined();
      expect(prisma.trip.create).toHaveBeenCalled();
    });

    it("should fail if unauthorized", async () => {
      const response = await app.handle(
        new Request("http://localhost/trip/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { name: "Origin", latitude: 1.0, longitude: 1.0 },
            destination: { name: "Destination", latitude: 2.0, longitude: 2.0 },
            capacity: 4,
          }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should fail if invalid body", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);

      const response = await app.handle(
        new Request("http://localhost/trip/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({
            origin: { name: "Origin" }, // missing lat lng
            destination: { name: "Destination", latitude: 2.0, longitude: 2.0 },
            capacity: 4,
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("Cancel Trip", () => {
    it("should cancel trip by captain", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "ACCEPTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip cancelled successfully!");
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: "trip-id" },
        data: { status: "CANCELLED" },
      });
    });

    it("should cancel trip by user before accepted", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        userId: "user-id",
        status: "REQUESTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip cancelled successfully!");
    });

    it("should fail if user tries to cancel after accepted", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        userId: "user-id",
        status: "ACCEPTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Ride has already started!");
    });

    it("should fail if unauthorized", async () => {
      const response = await app.handle(
        new Request("http://localhost/trip/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should fail if trip not found", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);
      prisma.trip.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/trip/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip not found!");
    });
  });

  describe("Pickup Trip", () => {
    it("should pickup trip successfully", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "ACCEPTED",
        otp: "1234",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/pickup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id", otp: "1234" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip picked up successfully!");
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: "trip-id" },
        data: { status: "ON_TRIP" },
      });
    });

    it("should fail if invalid otp", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "ACCEPTED",
        otp: "1234",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/pickup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id", otp: "wrong" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Invalid trip or OTP!");
    });

    it("should fail if captain not found", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/trip/pickup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id", otp: "1234" }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should fail if trip not accepted", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "REQUESTED",
        otp: "1234",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/pickup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id", otp: "1234" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Invalid trip or OTP!");
    });
  });

  describe("Complete Trip", () => {
    it("should complete trip successfully", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "ON_TRIP",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip completed successfully!");
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: "trip-id" },
        data: { status: "COMPLETED" },
      });
    });

    it("should fail if invalid trip", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "different-id",
        status: "ON_TRIP",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Invalid trip!");
    });

    it("should fail if captain not found", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/trip/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should fail if trip not on trip", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        captainId: "captain-id",
        status: "ACCEPTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Invalid trip!");
    });
  });

  describe("Match Trip", () => {
    it("should match trip successfully", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        status: "REQUESTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip matched successfully!");
      expect(body.tripid).toBe("trip-id");
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: "trip-id" },
        data: {
          status: "ACCEPTED",
          captain: { connect: { id: "captain-id" } },
        },
      });
    });

    it("should fail if not captain", async () => {
      const userPayload = { user: "user-id", role: "user" };
      const token = generateToken(userPayload);

      const response = await app.handle(
        new Request("http://localhost/trip/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it("should fail if trip not found", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/trip/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Trip not found!");
    });

    it("should fail if trip already accepted", async () => {
      const captainPayload = { user: "captain-id", role: "captain" };
      const token = generateToken(captainPayload);
      prisma.captain.findUnique.mockResolvedValue({ id: "captain-id" });
      prisma.trip.findUnique.mockResolvedValue({
        id: "trip-id",
        status: "ACCEPTED",
      });

      const response = await app.handle(
        new Request("http://localhost/trip/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ id: "trip-id" }),
        }),
      );

      expect(response.status).toBe(401);
    });
  });
});
