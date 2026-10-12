# Voice Mod

A small monorepo with an Expo (React Native + TypeScript) app and a FastAPI chat backend.

## Requirements

- Node.js and npm
- Python 3.11+

## Install

Install the JavaScript workspace dependencies from the repository root:

```sh
npm install
```

Set up the Python API environment and local configuration:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r apps/api/requirements.txt
cp .env.example .env
```

Edit `.env` and add approved members to `ALLOWED_USERS_JSON` as a JSON array of objects with `phoneNumber` and `userName` fields. For example:

```env
ALLOWED_USERS_JSON=[{"phoneNumber":"4155550123","userName":"Alex"}]
```

The whitelist stays on the server. An empty list rejects every sign-in. Phone numbers must contain at least 10 digits. A leading `+`, spaces, hyphens, and parentheses are ignored when matching. Usernames are matched exactly after trimming whitespace. Restart the API after changing the whitelist.

## Run

Start the FastAPI development server in one terminal. The script uses the project virtual environment directly:

```sh
npm run dev:api
```

Start the Expo app in another terminal:

```sh
npm run dev:mobile
```

The API is served on port `8000`; its health check is at `/health`, interactive Swagger UI is at `/docs`, OpenAPI JSON is at `/openapi.json`, and ReDoc is at `/redoc`. The app defaults to `http://127.0.0.1:8000`. For a physical phone or Android emulator, set `EXPO_PUBLIC_API_URL` to an address reachable from the device, such as your computer's LAN IP, before starting Expo:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000 npm run dev:mobile
```

Use your computer's actual LAN IP and ensure the device and computer can reach each other. Expo Go and the API must both be allowed through the local firewall. For Expo web on a different port, add its origin to `CORS_ORIGINS` in `.env`.

## Sign-in and chat behavior

The API issues a short-lived (12-hour), in-memory session only when both submitted fields match an allowlisted pair. The app uses that session to authenticate a WebSocket connection at `/ws/chat`. Messages are broadcast live to connected users and the most recent 100 messages are kept in memory; sessions and chat history are cleared when the API restarts.

This starter checks a phone-number/username pair; it does **not** verify phone ownership with an SMS code. Anyone who knows an approved pair can impersonate that member. Before production use, add SMS one-time-password verification, persistent storage, TLS, and production session management. Do not treat the pair alone as strong authentication.

## Structure

```text
apps/
  api/      FastAPI backend
    app/
      api/             FastAPI dependencies and route adapters
      core/            settings and application configuration
      domain/          account and session models
      infrastructure/  whitelist, session, and chat-hub adapters
      schemas/         HTTP and WebSocket request/response models
      services/        authentication use case and repository ports
      main.py          app factory, lifespan, and dependency composition
  mobile/   Expo app
    src/
      app/        Expo Router routes
      components/ shared feature components
      features/   auth and chat workflows, screens, and hooks
      lib/        shared Expo Fetch API client
      theme/      design tokens
      ui/         reusable controls
```
