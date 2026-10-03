# InternShield Talk — Terminal Lab

The terminal is the first development lab, not the final user interface.

## Goal

Use terminal commands to run the signaling service and inspect a two-peer voice session before adding the polished browser UI.

## Planned layout

```text
talk/
├── README.md
├── PROTOCOL.md
└── terminal/
    ├── README.md
    ├── server/
    └── client/
```

## Required tools

- Node.js 20+
- npm
- WebRTC-capable browser for the actual media test
- OpenSSL for local secrets
- curl for health checks
- optional Docker

## Debug flow

```text
terminal
  |
  +-- start signaling server
  |
  +-- health check
  |
  +-- inspect WebSocket events
  |
  +-- launch two browser clients
  |
  +-- verify SDP/ICE
  |
  +-- verify inbound audio stats
```

## Future CLI

A future native CLI may expose:

```bash
talk join IS-TALK-0718
talk status
talk mute
talk leave
```

The CLI itself should not carry media unless we later add a native WebRTC/audio runtime. The first milestone is to prove the protocol and server behavior with a browser WebRTC client.
