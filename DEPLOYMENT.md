# QuizArena — Hosting & Deployment Guide

QuizArena can be hosted online so that players anywhere in the world can join from their phones using a public URL or by scanning the lobby QR code.

---

## Architecture Overview

- **Single Process / Port:** In production, Express serves the built React frontend (`client/dist`), the REST API (`/api/*`), and the real-time WebSocket server (`Socket.IO`) all on a single port (`process.env.PORT || 3001`).
- **Database:** SQLite via `sql.js` (WebAssembly). Data is stored at `DATABASE_PATH` (defaults to `server/quiz.db`).
- **WebSockets:** Requires a platform that supports persistent HTTP/WebSocket connections. Avoid serverless platforms like Vercel or Netlify.

---

## Method 1: Deploy on Render (Recommended)

Render offers native WebSocket support and automatic deployments from GitHub.

### Steps:
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter
6. *(Optional but recommended for persisting quizzes across restarts)*:
   - Under **Disks**, add a disk:
     - **Name:** `quiz-data`
     - **Mount Path:** `/var/data`
     - **Size:** 1 GB
   - Under **Environment Variables**, add:
     - `DATABASE_PATH` = `/var/data/quiz.db`
     - `NODE_ENV` = `production`
7. Click **Deploy Web Service**.
8. Your app will be live at `https://<your-subdomain>.onrender.com`.

---

## Method 2: Deploy on Railway

Railway auto-detects Node.js and supports WebSockets out of the box.

### Steps:
1. Sign in to [Railway.app](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically detect the build and start commands from `package.json`:
   - Build: `npm run build`
   - Start: `npm start`
5. Under **Variables**, set:
   - `PORT` = `3001` (or let Railway assign its `$PORT`)
   - `NODE_ENV` = `production`
6. *(Optional)* Add a Persistent Volume mounted to `/data` and set `DATABASE_PATH=/data/quiz.db`.
7. Click **Generate Domain** in the service settings to get your public HTTPS URL.

---

## Method 3: Run with Docker

A production [Dockerfile](Dockerfile) is included in the project.

### Build and Run:
```bash
# Build the Docker image
docker build -t quizarena .

# Run with a persistent volume for the SQLite database
docker run -d \
  --name quizarena \
  -p 3001:3001 \
  -v quizarena_data:/app/server \
  -e NODE_ENV=production \
  quizarena
```
Access the application at `http://localhost:3001`.

---

## Method 4: Instant Public URL with Tunnels (No Deployment Required)

If you just want remote players or friends to play right now without setting up cloud accounts:

1. Start QuizArena locally using `start.bat` or `npm run dev`.
2. In a separate terminal, run a tunnel to the Vite dev server (port 5173):
   ```bash
   npx localtunnel --port 5173
   ```
   *or with ngrok:*
   ```bash
   ngrok http 5173
   ```
3. Share the generated public HTTPS URL with your players.
