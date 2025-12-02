import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/index";
import bcrypt from "bcrypt";

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
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

import { prisma } from "../lib/prisma";

describe("Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Captain Signup", () => {
    it("should create captain successfully", async () => {
      prisma.captain.findUnique.mockResolvedValue(null);
      prisma.captain.create.mockResolvedValue({});

      const response = await app.handle(
        new Request("http://localhost/auth/captain-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            vehicle: "Sedan",
            capacity: 4,
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Captain created!");
      expect(prisma.captain.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          vehicle: "Sedan",
          capacity: 4,
          email: "john@example.com",
          password: "hashed_password",
        },
      });
    });

    it("should fail if passwords do not match", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/captain-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            vehicle: "Sedan",
            capacity: 4,
            email: "john@example.com",
            password: "password123",
            confirmPassword: "different",
          }),
        }),
      );

      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe("Passwords do not match");
    });

    it("should fail if email already in use", async () => {
      prisma.captain.findUnique.mockResolvedValue({ id: "existing-id" });

      const response = await app.handle(
        new Request("http://localhost/auth/captain-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            vehicle: "Sedan",
            capacity: 4,
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe("Email already in use");
    });

    it("should fail with invalid email format", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/captain-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            vehicle: "Sedan",
            capacity: 4,
            email: "invalid-email",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it("should fail with missing required fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/captain-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            // missing others
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("User Signup", () => {
    it("should create user successfully", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({});

      const response = await app.handle(
        new Request("http://localhost/auth/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            email: "jane@example.com",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("User created!");
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Jane Doe",
          email: "jane@example.com",
          password: "hashed_password",
        },
      });
    });

    it("should fail if passwords do not match", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            email: "jane@example.com",
            password: "password123",
            confirmPassword: "different",
          }),
        }),
      );

      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe("Passwords do not match");
    });

    it("should fail if email already in use", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing-id" });

      const response = await app.handle(
        new Request("http://localhost/auth/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            email: "jane@example.com",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe("Email already in use");
    });

    it("should fail with invalid email format", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            email: "invalid-email",
            password: "password123",
            confirmPassword: "password123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it("should fail with missing required fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/user-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jane Doe",
            // missing others
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("Login User", () => {
    it("should login successfully", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "jane@example.com",
        password: "hashed_password",
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await app.handle(
        new Request("http://localhost/auth/login-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "jane@example.com",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toBeDefined(); // JWT token
    });

    it("should fail if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/auth/login-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "jane@example.com",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Login unsuccessful!");
    });

    it("should fail if password incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "jane@example.com",
        password: "hashed_password",
      });
      bcrypt.compare.mockResolvedValue(false);

      const response = await app.handle(
        new Request("http://localhost/auth/login-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "jane@example.com",
            password: "wrongpassword",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Login unsuccessful!");
    });

    it("should fail with invalid email format", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/login-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid-email",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it("should fail with missing fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/login-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "jane@example.com",
            // missing password
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe("Login Captain", () => {
    it("should login successfully", async () => {
      prisma.captain.findUnique.mockResolvedValue({
        id: "captain-id",
        email: "john@example.com",
        password: "hashed_password",
      });
      bcrypt.compare.mockResolvedValue(true);

      const response = await app.handle(
        new Request("http://localhost/auth/login-captain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toBeDefined(); // JWT token
    });

    it("should fail if captain not found", async () => {
      prisma.captain.findUnique.mockResolvedValue(null);

      const response = await app.handle(
        new Request("http://localhost/auth/login-captain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Login unsuccessful!");
    });

    it("should fail if password incorrect", async () => {
      prisma.captain.findUnique.mockResolvedValue({
        id: "captain-id",
        email: "john@example.com",
        password: "hashed_password",
      });
      bcrypt.compare.mockResolvedValue(false);

      const response = await app.handle(
        new Request("http://localhost/auth/login-captain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            password: "wrongpassword",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Login unsuccessful!");
    });

    it("should fail with invalid email format", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/login-captain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid-email",
            password: "password123",
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it("should fail with missing fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/login-captain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "john@example.com",
            // missing password
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });
});
