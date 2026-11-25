# Transcript Manager - Assignment 3 starter

This project contains the Transcript Manager server and client used for Assignment 3.

## Setup

```sh
npm install
```

## Run the tests

```sh
npm test
```

The spec files contain `it.todo(...)` placeholders. Replace every todo with a real test from the assignment description.

## Run the server

```sh
npm run start
```

The server listens on `http://localhost:4001`.

## Project layout

- `src/server/transcriptManager.ts` - data layer
- `src/server/transcriptServer.ts` - Express routes
- `src/server/server.ts` - server entry point
- `src/client/client.ts` - client functions for the API
- `src/client/remoteService.ts` - axios wrapper
- `src/server/transcriptManager.spec.ts` - Part 1 unit tests
- `src/integration.spec.ts` - Part 2 integration tests
