uber/backend/WS_RULES.md
# WebSocket Rules for Uber Clone Frontend

This document outlines the WebSocket (WS) communication protocol for the Uber clone backend. It is designed to guide frontend developers (for both user and captain apps) on how to connect, send messages, and handle responses without errors. Follow these rules strictly to ensure real-time functionality works seamlessly.

## General Rules
- **Connection URL**: `ws://localhost:3000/realtime?token=<JWT_TOKEN>`
  - Replace `<JWT_TOKEN>` with the JWT obtained from login (e.g., `/auth/login-user` or `/auth/login-captain`).
  - The token must be valid; invalid tokens will close the connection with code 4002.
- **Authentication**: WS connections are authenticated via the token. No additional auth is needed in messages.
- **Message Format**: All messages are JSON objects with `type` and `payload`.
  - Send: `{ "type": "message_type", "payload": { ... } }`
  - Receive: `{ "type": "response_type", "payload": { ... } }`
- **Roles**: 
  - Users and captains connect the same way, but message types differ based on role.
  - Backend validates role from JWT; sending wrong messages for your role will result in errors.
- **Connection Management**:
  - Reconnect on disconnect (e.g., network issues).
  - Handle close codes: 4001 (no token), 4002 (invalid token).
  - Clean up on app close.
- **Errors**: If a message fails, you'll receive `{ "type": "error", "payload": "error_message" }`. Log and handle gracefully (e.g., retry or notify user).
- **Real-Time Nature**: WS is for live updates. Use HTTP for one-time actions (e.g., request trip).
- **Testing**: Use tools like WebSocket King or browser dev tools. Backend tests cover these flows.

## For Users (Rider App)
Users connect after logging in. They subscribe to trip updates immediately after requesting a trip via HTTP.

### Messages to Send
1. **Subscribe to Trip Updates** (Send once after HTTP trip request)
   - Type: `"subscribe:trip"`
   - Payload: `{ "tripId": "string" }` (Trip ID from `/user/request` response)
   - When to Send: Right after successful trip request. This starts listening for location and status updates.
   - Example:
     ```json
     {
       "type": "subscribe:trip",
       "payload": { "tripId": "trip-uuid-123" }
     }
     ```

### Messages You Receive
1. **Subscription Confirmation**
   - Type: `"subscribed"`
   - Payload: `{ "tripId": "string", "status": "string" }` (Current trip status, e.g., "REQUESTED")
   - Action: Confirm subscription; display initial status.

2. **Captain Location Update**
   - Type: `"location:update"`
   - Payload: `{ "tripId": "string", "lat": number, "long": number }`
   - Action: Update map with captain's live location. Receive periodically during "ACCEPTED" or "ON_TRIP" status.

3. **Trip Status Update**
   - Type: `"status:update"`
   - Payload: `{ "tripId": "string", "status": "string" }` (Statuses: "ACCEPTED", "ON_TRIP", "COMPLETED", "CANCELLED")
   - Action: Update UI (e.g., show "Captain accepted", "Ride started", etc.). Handle completion/cancellation.

4. **Errors**
   - Type: `"error"`
   - Payload: `"string"` (e.g., "Trip not found or unauthorized")
   - Action: Alert user; retry if applicable.

### User Flow Example
1. Login via HTTP, get JWT.
2. Connect WS: `ws://localhost:3000/realtime?token=<JWT>`
3. Request trip via HTTP `/user/request`, get `tripId`.
4. Send WS: `{ "type": "subscribe:trip", "payload": { "tripId": "trip-123" } }`
5. Receive: `{ "type": "subscribed", "payload": { "tripId": "trip-123", "status": "REQUESTED" } }`
6. When captain accepts: Receive `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "ACCEPTED" } }`
7. Receive periodic `{ "type": "location:update", ... }` for tracking.
8. On pickup: `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "ON_TRIP" } }`
9. On complete: `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "COMPLETED" } }`

### Rules for Users
- Always subscribe after requesting a trip; don't send other messages.
- Handle disconnections: Re-subscribe on reconnect.
- Location updates are for tracking; status updates drive UI state.
- If no captain assigned yet, you may not receive location updates until "ACCEPTED".

## For Captains (Driver App)
Captains connect after logging in. They send locations for pooling (to get matched) or during active trips.

### Messages to Send
1. **Send Location for Pooling** (To become available for matching)
   - Type: `"send:location"`
   - Payload: `{ "lat": number, "long": number }` (No `tripId`)
   - When to Send: When starting to drive and pool for trips. Send periodically (e.g., every 5-10 seconds) while online.
   - Example:
     ```json
     {
       "type": "send:location",
       "payload": { "lat": 12.9716, "long": 77.5946 }
     }
     ```

2. **Send Location During Matched Trip** (To update user)
   - Type: `"send:location"`
   - Payload: `{ "lat": number, "long": number, "tripId": "string" }`
   - When to Send: After trip is matched ("ACCEPTED"). Send periodically until trip ends.
   - Example:
     ```json
     {
       "type": "send:location",
       "payload": { "lat": 12.9716, "long": 77.5946, "tripId": "trip-uuid-123" }
     }
     ```

### Messages You Receive
1. **Location Sent Confirmation**
   - Type: `"location:updated"`
   - Payload: `"Location sent"`
   - Action: Confirm location was saved; no UI update needed.

2. **Trip Status Update**
   - Type: `"status:update"`
   - Payload: `{ "tripId": "string", "status": "string" }` (Statuses: "ACCEPTED", "ON_TRIP", "COMPLETED", "CANCELLED")
   - Action: Update driver UI (e.g., "Trip accepted", "Start ride", etc.).

3. **Errors**
   - Type: `"error"`
   - Payload: `"string"` (e.g., "Invalid payload")
   - Action: Alert driver; retry sending location.

### Captain Flow Example
1. Login via HTTP, get JWT.
2. Connect WS: `ws://localhost:3000/realtime?token=<JWT>`
3. Start pooling: Send periodic `{ "type": "send:location", "payload": { "lat": ..., "long": ... } }` (no tripId).
4. Receive: `{ "type": "location:updated", "payload": "Location sent" }`
5. When matched: Receive `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "ACCEPTED" } }`
6. Switch to trip mode: Send `{ "type": "send:location", "payload": { "lat": ..., "long": ..., "tripId": "trip-123" } }` periodically.
7. On pickup (via HTTP): Receive `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "ON_TRIP" } }`
8. On complete: `{ "type": "status:update", "payload": { "tripId": "trip-123", "status": "COMPLETED" } }`

### Rules for Captains
- Send locations without `tripId` for pooling; with `tripId` only for matched trips.
- Stop pooling locations when a trip is accepted (switch to trip mode).
- Handle status updates to guide actions (e.g., navigate to pickup on "ACCEPTED").
- If disconnected, resume sending locations on reconnect.

## Common Pitfalls to Avoid
- **Don't Send Messages Without Connecting**: Always connect first.
- **Token Expiry**: JWT expires in 7 days; handle refresh if needed.
- **Role Mismatch**: Users can't send captain messages, and vice versa.
- **Payload Errors**: Ensure lat/long are numbers, tripId is string.
- **Over-Sending**: Throttle location sends (e.g., every 5s) to avoid spam.
- **Ignoring Errors**: Always handle "error" messages.
- **Testing Locally**: Use `bun run dev` for backend; connect via frontend dev server.

## Backend Reference
- See `routes/ws.ts` for implementation.
- Notifications are sent automatically on HTTP status changes (e.g., match, pickup).

For questions, check backend code or run tests.