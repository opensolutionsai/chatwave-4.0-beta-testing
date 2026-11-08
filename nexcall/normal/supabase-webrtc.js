// NexCall Supabase WebRTC & Signaling Engine for Guest Mode
import { supabase } from "./supabase-config.js";

const peerConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let channel = null;
let currentRoomId = null;
let amIHost = false;

let callbacks = {
  onCallAccepted: () => {},
  onCallEnded: () => {},
  onRemoteStream: () => {},
  onChatMessage: () => {},
  onError: () => {}
};

/**
 * Initializes and starts the WebRTC guest call session
 */
export async function startGuestCall(roomId, isHost, localVideo, remoteVideo, guestCallbacks) {
  currentRoomId = roomId;
  amIHost = isHost;
  callbacks = { ...callbacks, ...guestCallbacks };

  try {
    // 1. Initialize local media
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localVideo.srcObject = localStream;
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    // 2. Initialize RTCPeerConnection
    peerConnection = new RTCPeerConnection(peerConfiguration);

    // 3. Bind local tracks
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // 4. Handle remote tracks
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      callbacks.onRemoteStream(remoteStream);
    };

    // 5. Setup Supabase Realtime Channel
    channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    // 6. Bind ICE Candidate gatherer
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && channel) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'candidate',
            sender: isHost ? 'host' : 'guest',
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    // 7. Subscribe to the channel & handle broadcasts
    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!payload) return;

        // Guest Joins -> Host creates offer
        if (payload.type === 'join' && isHost) {
          try {
            const offerDescription = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offerDescription);
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'offer',
                sender: 'host',
                sdp: offerDescription.sdp,
                sdpType: offerDescription.type
              }
            });
          } catch (err) {
            console.error("Error creating guest offer:", err);
            callbacks.onError("Failed to negotiate connection.");
          }
        }

        // Offer Received -> Guest sets remote desc and creates answer
        if (payload.type === 'offer' && !isHost) {
          try {
            const offerDesc = new RTCSessionDescription({ sdp: payload.sdp, type: payload.sdpType });
            await peerConnection.setRemoteDescription(offerDesc);

            const answerDescription = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDescription);

            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'answer',
                sender: 'guest',
                sdp: answerDescription.sdp,
                sdpType: answerDescription.type
              }
            });
            callbacks.onCallAccepted();
          } catch (err) {
            console.error("Error answering guest offer:", err);
            callbacks.onError("Failed to answer incoming connection.");
          }
        }

        // Answer Received -> Host sets remote desc and completes setup
        if (payload.type === 'answer' && isHost) {
          try {
            const answerDesc = new RTCSessionDescription({ sdp: payload.sdp, type: payload.sdpType });
            await peerConnection.setRemoteDescription(answerDesc);
            callbacks.onCallAccepted();
          } catch (err) {
            console.error("Error setting guest answer:", err);
            callbacks.onError("Failed to complete connection handshake.");
          }
        }

        // ICE Candidate exchange
        if (payload.type === 'candidate') {
          const expectedSender = isHost ? 'guest' : 'host';
          if (payload.sender === expectedSender && peerConnection) {
            try {
              const candidate = new RTCIceCandidate(payload.candidate);
              await peerConnection.addIceCandidate(candidate);
            } catch (err) {
              console.warn("Error adding guest ICE candidate:", err);
            }
          }
        }

        // Hang Up signal
        if (payload.type === 'hangup') {
          cleanUpGuestCall();
          callbacks.onCallEnded();
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (payload) {
          callbacks.onChatMessage(payload);
        }
      });

    // 8. Join Channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // If joiner, notify host that we are ready
        if (!isHost) {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'join', sender: 'guest' }
          });
        }
      }
    });

  } catch (err) {
    console.error("Error starting guest call:", err);
    cleanUpGuestCall();
    throw err;
  }
}

/**
 * Sends a chat message over the realtime guest channel
 */
export function sendGuestChatMessage(senderName, text) {
  if (!channel) return;
  channel.send({
    type: 'broadcast',
    event: 'chat',
    payload: {
      senderName: senderName,
      text: text,
      timestamp: Date.now()
    }
  });
}

/**
 * Signals hang up and clean up
 */
export async function hangUpGuestCall() {
  if (channel) {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'hangup', sender: amIHost ? 'host' : 'guest' }
      });
    } catch (err) {
      console.warn("Failed to broadcast guest hangup:", err);
    }
  }
  cleanUpGuestCall();
}

/**
 * Export active stream getter
 */
export function getLocalGuestStream() {
  return localStream;
}

/**
 * Audio control
 */
export function toggleGuestAudio(mute) {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !mute;
    });
  }
}

/**
 * Video control
 */
export function toggleGuestVideo(disable) {
  if (localStream) {
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !disable;
    });
  }
}

/**
 * Screen share control
 */
export async function toggleGuestScreenShare(enable, onStopCallback) {
  if (!peerConnection) return null;
  try {
    if (enable) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      const videoTrack = screenStream.getVideoTracks()[0];
      
      const senders = peerConnection.getSenders();
      const sender = senders.find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }

      videoTrack.onended = () => {
        toggleGuestScreenShare(false, onStopCallback);
        if (onStopCallback) onStopCallback();
      };
      
      return screenStream;
    } else {
      const videoTrack = localStream.getVideoTracks()[0];
      const senders = peerConnection.getSenders();
      const sender = senders.find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      return null;
    }
  } catch (err) {
    console.error("Guest Screen share failed:", err);
    throw err;
  }
}

/**
 * Resource cleanup
 */
export function cleanUpGuestCall() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  remoteStream = null;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (channel) {
    channel.unsubscribe();
    channel = null;
  }

  currentRoomId = null;
}
