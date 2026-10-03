# InternShield Talk — Voice Protocol

## Channel

A channel is identified by a user-facing code such as:

`IS-TALK-0718`

The client hashes the code before using it as an internal room identifier.

## Signaling

WebSocket messages are transient signaling messages only:

- hello / ready
- offer
- answer
- ICE candidate
- hangup

The signaling server never receives the audio RTP stream.

## Media

The browser captures microphone audio with getUserMedia and sends an audio track over RTCPeerConnection.

Preferred path:

```
Browser A <==== SRTP / WebRTC ====> Browser B
```

Fallback:

```
Browser A <== TURN relay ==> Browser B
```

## Room lifecycle

```
0 peers  -> no room state
1 peer   -> waiting
2 peers  -> negotiate
0 peers  -> destroy room state
```

Maximum participants for the first prototype: 2.

## Privacy goal

No call recording, no transcript, no message history, and no persistent application room database.

The server may see normal connection/network metadata required to provide the service.

## Future

Video is a separate media track and can be added after voice reliability is proven.
