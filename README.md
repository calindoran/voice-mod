# Voice Mod

A small monorepo with an Expo app and a FastAPI backend for allowlisted sign-in, community servers, server-scoped text chat, and LiveKit group voice rooms.

## Requirements

- Node.js and npm
- Python 3.11+
- Docker with the Compose plugin (for the local LiveKit server)

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

The whitelist stays on the server. An empty list rejects every sign-in. Phone numbers must contain at least 10 digits. A leading `+`, spaces, hyphens, and parentheses are ignored when matching. Usernames are matched exactly after trimming whitespace. Keep `USER_ID_SECRET` unchanged while the SQLite database contains community memberships; changing it gives allowlisted accounts new IDs. Restart the API after changing the whitelist.

## Run locally

On macOS, open Docker Desktop first and wait until it reports that the engine is running. Confirm the daemon is available with `docker info`; installing the Docker CLI alone is not enough. If Docker reports that `docker.sock` is missing, start Docker Desktop and wait for startup to finish.

Terminal 1: start the self-hosted LiveKit server and leave it running:

```sh
npm run dev:livekit
```

This uses LiveKit's local development mode (`devkey` / `secret`) and exposes signaling on port `7880`, TCP media fallback on `7881`, and UDP media on `7882`. These development credentials and settings are not production-safe.

In development, the API defaults to the local URL and credentials used by this Compose service (`ws://127.0.0.1:7880`, `devkey`, and `secret`), so no LiveKit `.env` values are needed for browser testing. For a physical device, set `LIVEKIT_URL=ws://<LAN_IP>:7880` and `LIVEKIT_NODE_IP=<LAN_IP>` in the repository-root `.env`; the latter makes LiveKit advertise an address the phone can reach. Restart the API and recreate the LiveKit container after changing these values with `docker compose up -d --force-recreate livekit`. In production, set `APP_ENV=production` and provide all three LiveKit settings explicitly; the API refuses to issue voice tokens if they are missing.

Terminal 2: start the FastAPI API:

```sh
npm run dev:api
```

Terminal 3: start Expo web for browser testing:

```sh
npm run dev:web
```

Open the URL printed by Expo, usually `http://localhost:8081`, and allow microphone access when prompted. The browser can use `127.0.0.1` for the API and local LiveKit. Microphone access requires a secure browser context; localhost qualifies. For a physical Android device, put `EXPO_PUBLIC_API_URL=http://<LAN_IP>:8000` in `apps/mobile/.env.local`, and use the same LAN IP for `LIVEKIT_URL` and `LIVEKIT_NODE_IP` in the repository-root `.env`. Keep the phone and computer on the same Wi-Fi network and allow TCP ports `8000`, `8081`, `7880`, `7881` and UDP port `7882` through the host firewall.

The mobile app uses native WebRTC modules and therefore does not run in Expo Go. Sign in to EAS, build and install the Android development client, then start Metro from the mobile app directory so its QR code uses LAN networking:

```sh
npx eas-cli build --profile development --platform android
cd apps/mobile
npx expo start --dev-client --lan
```

The Expo config plugins and microphone permissions are already configured. For a public deployment, use a domain with TLS/WSS, configure LiveKit's public IP and firewall/UDP range, replace the development API key and secret, and provide enough compute and bandwidth. Self-hosting avoids LiveKit Cloud usage fees, but hosting and network transfer can still cost money.

The API health check is at `/health`, interactive Swagger UI is at `/docs`, OpenAPI JSON is at `/openapi.json`, and ReDoc is at `/redoc`. For Expo web on a different port, add its origin to `CORS_ORIGINS` in `.env`.

## Servers, text, and voice

After sign-in, users can create discoverable servers or join/leave existing ones. The creator becomes the first member; each server has a shared text chat and a LiveKit voice room. Text chat remains available while users are in a voice call. Server membership, server details, and the latest 100 messages are stored in `apps/api/data/voice-mod.sqlite3` and survive API restarts.

FastAPI authorizes server membership and issues short-lived room-scoped LiveKit tokens. LiveKit carries audio; audio is not proxied through FastAPI. The API's authenticated WebSocket is scoped to a server at `/ws/servers/{server_id}/chat`.

This starter checks a phone-number/username pair; it does **not** verify phone ownership with an SMS code. Anyone who knows an approved pair can impersonate that member. Before production use, add SMS one-time-password verification, robust account management, TLS, and production session management. Do not treat the pair alone as strong authentication.

## Structure

```text
apps/
  api/      FastAPI backend
    app/
      api/             FastAPI dependencies and route adapters
      core/            settings and application configuration
      domain/          account, chat, and community models
      infrastructure/  whitelist, SQLite, session, and chat-hub adapters
      schemas/         HTTP and WebSocket request/response models
      services/        authentication, community, and voice use cases
      main.py          app factory, lifespan, and dependency composition
  mobile/   Expo app
    src/
      app/        Expo Router routes
      components/ shared feature components
      features/   auth, servers, chat, and voice workflows
      lib/        Expo Fetch API client and native LiveKit registration
      theme/      design tokens
      ui/         reusable controls
```
