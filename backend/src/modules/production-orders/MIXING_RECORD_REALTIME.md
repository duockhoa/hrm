# Mixing record updates

The EBR detail page uses REST for reads/writes and the Socket.IO namespace
`/mixing-records` for invalidation notifications. There is no periodic REST polling.

- Connect on the backend API host/port, using the `/socket.io` transport path.
  The client uses WebSocket transport; a reverse proxy must forward WebSocket
  upgrades on that path (and any public API path prefix).
- Send `{ accessToken, recordId }` in Socket.IO `auth`, never in query parameters.
  The gateway verifies the JWT signature, expiry, `token_use: "access"`, current
  user, `production-orders.read` permission and existence of the requested record.
  Each connection subscribes to one record. Clients cannot choose arbitrary rooms.
- Login and REST refresh now mark access/refresh JWTs with `token_use`. Existing
  unmarked access tokens trigger one REST refresh before socket reconnection.
  The client shares token refresh with Axios, and disconnects on logout.
- The REST controller interceptor emits `mixing-record:changed` only after a
  successful write, including structure edits, results, notes, images and approvals.
  Events contain the record ID and a whole-record deletion flag, not record content.
- `mixing-record:ready` is sent after joining the authorized room. The client
  resyncs after initial connection/reconnection to cover changes missed offline,
  and coalesces change notifications into REST refreshes. It displays a connection
  indicator and offers manual refresh while disconnected.
- Access-token expiry closes the connection and triggers authenticated reconnect.
  Unsaved result/note drafts remain separate from server values.

Deploy backend and EBR frontend together. This implementation uses the in-process
Socket.IO adapter, matching the current single-process backend. Multiple backend
workers/replicas require a shared adapter such as Redis so writes on one worker
notify connections on the others.

Backend integration tests:

```sh
npm test -- --runInBand production-order-mixing-records.gateway.spec.ts production-order-mixing-records.controller.spec.ts auth.service.spec.ts
```

Frontend connection tests (from `ebr_frontend`):

```sh
test_output_dir=$(mktemp -d)
./node_modules/.bin/tsc src/features/production-order-mixing-records/mixing-record-connection.test.ts --outDir "$test_output_dir" --module commonjs --target es2017 --esModuleInterop --skipLibCheck
node --test "$test_output_dir/mixing-record-connection.test.js"
```
