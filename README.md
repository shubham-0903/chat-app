# Chat App Monorepo

This repository contains a multi-service chat application split into six services:

- `admin-portal` — Frontend admin portal
- `chat-app-frontend` — Chat application frontend (user-facing)
- `chat-app-api` — API service (authentication, user management, rules)
- `chat-app-socket` — Chat backend / socket server
- `blocker-service` — Service that manages blocked users and strikes
- `detector-service` — Violation detector service (pattern detection)

## Prerequisites

Before running the services, make sure you have the following installed and running on your machine or accessible from your environment:


You can use Docker to run these quickly for local development. Example (optional):

```bash
# Start MongoDB, RabbitMQ and Redis with docker-compose (create your own compose file or use individual containers)
docker run -d --name mongo -p 27017:27017 mongo:6
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name redis -p 6379:6379 redis:7
```

## Docker / Containerized development

you can also run the docker file to start all the services using below command. 

Quick usage:

```bash
# from repo root - build and start everything
docker compose up --build

# stop
docker compose down
```


## Environment variables

Each service expects a `.env` file in its folder. Create a `.env` for each service using the samples below and adjust values as needed.

Sample variables (common):

- `MONGODB_URI` — MongoDB connection string (e.g. `mongodb://localhost:27017/chat-app`)
- `RABBITMQ_URL` — RabbitMQ URL (e.g. `amqp://guest:guest@localhost:5672`)
- `REDIS_URL` — Redis connection (e.g. `redis://localhost:6379`)
- `JWT_SECRET` — Secret for signing JWTs
- `PORT` — Service port

### `chat-app-api` (.env.sample)

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/chat-app-api
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
```

### `chat-app-socket` (.env.sample)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app-socket
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:4000
```

### `chat-app-frontend` (.env.sample)

```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:5000
```


### `blocker-service` (.env.sample)

```
MONGODB_URI=mongodb://localhost:27017/blocker-service
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
```

### `detector-service` (.env.sample)

```
MONGODB_URI=mongodb://localhost:27017/detector-service
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

Tip: Copy these samples into `.env` files in the respective service folders and fill in secrets.

## Install and run

Each service has its own `package.json`. Install dependencies and run each service from its folder.

Example (do this for each service in a separate terminal):

```bash
# from repo root
cd admin-portal
npm install
# start script may be `dev`, `start` or `serve` depending on the package.json — check the scripts section
npm run dev


```
## Services mapping (folders)

- admin portal: `admin-portal`
- chat frontend: `chat-app-frontend`
- api service: `chat-app-api`
- chat backend/socket: `chat-app-socket`
- blocker service: `blocker-service`
- detector service: `detector-service`
