// NexCall WebRTC & P2P Signaling Engine
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// STUN configuration
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

// State variables
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentCallId = null;
let dataChannel = null;

// Firebase listeners for cleanup
let callDocListener = null;

// Callbacks to UI (app.js)
let uiCallbacks = {
  onCallAccepted: () => { },
  onCallEnded: () => { },
  onRemoteStream: () => { },
  onChatMessage: () => { },
  onError: () => { }
};

/**
 * Register UI callback handlers
 */
export function registerCallbacks(callbacks) {
  uiCallbacks = { ...uiCallbacks, ...callbacks };
}

/**
 * Initialize WebRTC connection with local camera and microphone
 */
async function initializeMedia(callType = "video") {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: callType === "video",
      audio: true
    });
    remoteStream = new MediaStream();
    return { localStream, remoteStream };
  } catch (err) {
    console.error("Error accessing media devices:", err);
    uiCallbacks.onError("Could not access camera/microphone. Please verify permissions.");
    throw err;
  }
}

/**
 * Setup RTCPeerConnection and add local tracks
 */
function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(peerConfiguration);

  // Add local tracks to peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Listen for remote tracks
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    uiCallbacks.onRemoteStream(remoteStream);
  };
}

/**
 * Setup E2EE Data Channel for Chat
 */
function setupDataChannel(channel) {
  channel.onmessage = (event) => {
    try {
      const messageData = JSON.parse(event.data);
      uiCallbacks.onChatMessage(messageData);
    } catch (err) {
      console.error("Failed to parse incoming chat message", err);
    }
  };
}

/**
 * Initiates an outgoing call
 */
export async function startCall(callerUser, calleeUser, callType = "video") {
  try {
    const media = await initializeMedia(callType);
    setupPeerConnection();

    // Create Data Channel for E2EE chat
    dataChannel = peerConnection.createDataChannel("chat");
    setupDataChannel(dataChannel);

    // Create Call document in Firestore
    const callRef = doc(collection(db, "calls"));
    currentCallId = callRef.id;

    // Create SDP Offer
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    // Wait for ICE candidate gathering to finish completely (Bulk ICE)
    if (peerConnection.iceGatheringState !== "complete") {
      await new Promise((resolve) => {
        const checkState = () => {
          if (peerConnection.iceGatheringState === "complete") {
            peerConnection.removeEventListener("icegatheringstatechange", checkState);
            resolve();
          }
        };
        peerConnection.addEventListener("icegatheringstatechange", checkState);
        // Safety timeout
        setTimeout(() => {
          peerConnection.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }, 2000);
      });
    }

    const offer = {
      sdp: peerConnection.localDescription.sdp,
      type: peerConnection.localDescription.type,
    };

    // Store Call metadata in Firestore (including callType for callee to read)
    await setDoc(callRef, {
      callerId: callerUser.uid,
      callerName: callerUser.displayName || callerUser.email.split("@")[0],
      callerEmail: callerUser.email,
      callerPhotoURL: callerUser.photoURL || "",
      calleeId: calleeUser.uid,
      calleeName: calleeUser.displayName || calleeUser.email.split("@")[0],
      calleeEmail: calleeUser.email,
      offer: offer,
      status: "ringing",
      callType: callType,
      createdAt: serverTimestamp()
    });

    // Listen to changes in the call document (waiting for answers or hang up)
    callDocListener = onSnapshot(callRef, async (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      // Handle call accepted
      if (data.status === "accepted" && !peerConnection.currentRemoteDescription && data.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(answerDescription);
        uiCallbacks.onCallAccepted();
      }

      // Handle call rejected/declined
      if (data.status === "declined" || data.status === "ended") {
        cleanUpCall();
        uiCallbacks.onCallEnded(data.status);
      }
    });

    return currentCallId;
  } catch (err) {
    console.error("Error starting call:", err);
    cleanUpCall();
    throw err;
  }
}



/**
 * Accepts an incoming call
 */
export async function acceptCall(callId, currentUserId) {
  try {
    currentCallId = callId;

    const callRef = doc(db, "calls", callId);
    const callDoc = await getDoc(callRef);
    if (!callDoc.exists()) throw new Error("Call session not found.");

    const callData = callDoc.data();
    const callType = callData.callType || "video";

    const media = await initializeMedia(callType);
    setupPeerConnection();

    // Listen for Data Channel from caller
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel(dataChannel);
    };

    // Set Remote description to Caller's Offer
    const offerDescription = new RTCSessionDescription(callData.offer);
    await peerConnection.setRemoteDescription(offerDescription);

    // Create SDP Answer
    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    // Wait for ICE candidate gathering to finish completely (Bulk ICE)
    if (peerConnection.iceGatheringState !== "complete") {
      await new Promise((resolve) => {
        const checkState = () => {
          if (peerConnection.iceGatheringState === "complete") {
            peerConnection.removeEventListener("icegatheringstatechange", checkState);
            resolve();
          }
        };
        peerConnection.addEventListener("icegatheringstatechange", checkState);
        // Safety timeout
        setTimeout(() => {
          peerConnection.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }, 2000);
      });
    }

    const answer = {
      sdp: peerConnection.localDescription.sdp,
      type: peerConnection.localDescription.type,
    };

    // Write answer and status back to call document
    await updateDoc(callRef, {
      answer: answer,
      status: "accepted"
    });

    // Listen to changes in the call document (listening for hang up)
    callDocListener = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      if (data.status === "ended") {
        cleanUpCall();
        uiCallbacks.onCallEnded("ended");
      }
    });

    return { localStream, remoteStream, callType, callerPhotoURL: callData.callerPhotoURL || null };
  } catch (err) {
    console.error("Error accepting call:", err);
    cleanUpCall();
    throw err;
  }
}

/**
 * Declines an incoming call
 */
export async function declineCall(callId) {
  try {
    const callRef = doc(db, "calls", callId);
    await updateDoc(callRef, { status: "declined" });
  } catch (err) {
    console.error("Error declining call:", err);
  }
}

/**
 * Cancels or terminates the active call
 */
export async function hangUpCall(duration = null) {
  if (!currentCallId) return;
  try {
    const callRef = doc(db, "calls", currentCallId);
    const updates = { status: "ended" };
    if (duration !== null) {
      updates.duration = duration;
    }
    await updateDoc(callRef, updates);
  } catch (err) {
    console.error("Error hanging up call:", err);
  } finally {
    cleanUpCall();
  }
}

/**
 * Mutes or unmutes local microphone track
 */
export function toggleAudio(mute) {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !mute;
    });
  }
}

/**
 * Enables or disables local camera feed
 */
export function toggleVideo(disable) {
  if (localStream) {
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !disable;
    });
  }
}

/**
 * Screen Sharing Implementation
 */
export async function toggleScreenShare(enable, onStopCallback) {
  if (!peerConnection) return null;
  try {
    if (enable) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      const videoTrack = screenStream.getVideoTracks()[0];

      // Replace the video track in peer connection
      const senders = peerConnection.getSenders();
      const sender = senders.find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }

      // Automatically handle screen sharing stop button of the browser
      videoTrack.onended = () => {
        toggleScreenShare(false, onStopCallback);
        if (onStopCallback) onStopCallback();
      };

      return screenStream;
    } else {
      // Revert back to camera stream
      const videoTrack = localStream.getVideoTracks()[0];
      const senders = peerConnection.getSenders();
      const sender = senders.find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      return null;
    }
  } catch (err) {
    console.error("Screen share failed:", err);
    throw err;
  }
}

/**
 * Send text message inside the active E2EE data channel
 */
export async function sendChatMessage(senderUid, text, senderName) {
  if (!dataChannel || dataChannel.readyState !== "open") {
    console.warn("Data channel not ready to send messages");
    return;
  }
  try {
    const msg = {
      senderUid: senderUid,
      senderName: senderName || "User",
      text: text,
      timestamp: Date.now()
    };
    dataChannel.send(JSON.stringify(msg));
  } catch (err) {
    console.error("Failed to send E2EE chat message:", err);
  }
}

/**
 * Clean up local variables, streams, and Firestore listeners
 */
export function cleanUpCall() {
  // Stop all media tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  remoteStream = null;

  // Close peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  // Remove Firestore subscriptions
  if (callDocListener) {
    callDocListener();
    callDocListener = null;
  }
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  currentCallId = null;
}

/**
 * Returns the active local stream
 */
export function getLocalStream() {
  return localStream;
}
