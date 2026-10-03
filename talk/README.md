# InternShield Talk — Terminal / WebRTC VoIP Prototype

This is the dedicated repository area for building the InternShield Talk communication engine.

## Initial goal

Create a working, two-person, channel-code voice system:

- same channel ID on both devices
- no participant account
- WebRTC audio
- WebSocket signaling
- STUN/TURN NAT traversal
- no call recording
- no application database
- temporary in-memory room state
- terminal-friendly server/client development workflow

## Research reference

The project was inspired by the open-source `binnukarunakar/walkietalkie` repository, which demonstrates browser WebRTC peer-to-peer voice with a small Node WebSocket signaling server and no server-side audio storage.

Reference:
https://github.com/binnukarunakar/walkietalkie

We are **not copying code** into InternShield. We are using its architecture and testing ideas as reference material while building an independent implementation.

## Development phases

1. Terminal-based WebRTC voice prototype
2. Browser channel UI
3. Push-to-talk / optional full-duplex modes
4. TURN reliability testing
5. Browser/mobile UX
6. Optional video track
7. Cloudflare deployment
8. Public launch

## First acceptance test

Two browser clients:

```text
Client A -> IS-TALK-0718
Client B -> IS-TALK-0718
```

Expected:

```text
signaling connected
peer discovered
SDP offer/answer exchanged
ICE connected
remote audio received
```

No audio bytes should be sent through the signaling WebSocket.

## Important

This is a prototype, not a finished production privacy service. Platform/network metadata can still exist even when the application does not record calls.
