// NexCall App Controller
import { auth, db } from "./firebase-config.js";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  registerCallbacks, 
  startCall, 
  acceptCall, 
  declineCall, 
  hangUpCall, 
  toggleAudio, 
  toggleVideo, 
  toggleScreenShare,
  sendChatMessage,
  cleanUpCall,
  getLocalStream
} from "./webrtc.js";
import { 
  startGuestCall, 
  hangUpGuestCall, 
  sendGuestChatMessage, 
  toggleGuestAudio, 
  toggleGuestVideo, 
  toggleGuestScreenShare, 
  getLocalGuestStream,
  cleanUpGuestCall
} from "./supabase-webrtc.js";

// DOM Elements
const authView = document.getElementById("auth-view");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const registerNameInput = document.getElementById("register-name");
const registerEmailInput = document.getElementById("register-email");
const registerPasswordInput = document.getElementById("register-password");
const authErrorMsg = document.getElementById("auth-error-msg");
const loginSpinner = document.getElementById("login-spinner");
const registerSpinner = document.getElementById("register-spinner");

const dashboardView = document.getElementById("dashboard-view");
const userDisplayName = document.getElementById("user-display-name");
const btnSignout = document.getElementById("btn-signout");
const contactsListContainer = document.getElementById("contacts-list-container");
const contactSearch = document.getElementById("contact-search");
const onlineCounter = document.getElementById("online-counter");

const addContactForm = document.getElementById("add-contact-form");
const addContactEmail = document.getElementById("add-contact-email");
const addContactFeedback = document.getElementById("add-contact-feedback");

// Selected Contact Detail view DOM references
const welcomePanel = document.getElementById("welcome-panel");
const contactDetailsPanel = document.getElementById("contact-details-panel");
const detailAvatar = document.getElementById("detail-avatar");
const detailName = document.getElementById("detail-name");
const detailEmail = document.getElementById("detail-email");
const detailStatus = document.getElementById("detail-status");
const btnDetailCall = document.getElementById("btn-detail-call");
const btnDetailBlock = document.getElementById("btn-detail-block");
const detailHistoryList = document.getElementById("detail-history-list");

// Settings Modal DOM references
const btnSettings = document.getElementById("btn-settings");
const settingsModal = document.getElementById("settings-modal");
const btnCloseSettings = document.getElementById("btn-close-settings");
const profileSettingsForm = document.getElementById("profile-settings-form");
const settingsDisplayName = document.getElementById("settings-display-name");
const settingsFeedback = document.getElementById("settings-feedback");
const btnDeleteAccount = document.getElementById("btn-delete-account");
const deleteFeedback = document.getElementById("delete-feedback");
const blockedUsersList = document.getElementById("blocked-users-list");
const settingsTabProfile = document.getElementById("settings-tab-profile");
const settingsTabBlocked = document.getElementById("settings-tab-blocked");

const callOverlay = document.getElementById("call-overlay");
const outgoingCallCard = document.getElementById("outgoing-call-card");
const incomingCallCard = document.getElementById("incoming-call-card");
const outgoingCalleeName = document.getElementById("outgoing-callee-name");
const outgoingCalleeEmail = document.getElementById("outgoing-callee-email");
const incomingCallerName = document.getElementById("incoming-caller-name");
const incomingCallerEmail = document.getElementById("incoming-caller-email");
const btnCancelCall = document.getElementById("btn-cancel-call");
const btnDeclineCall = document.getElementById("btn-decline-call");
const btnAcceptCall = document.getElementById("btn-accept-call");
const audioRinging = document.getElementById("audio-ringing");

const callRoomView = document.getElementById("call-room-view");
const remoteVideo = document.getElementById("remote-video");
const localVideo = document.getElementById("local-video");
const callPartnerName = document.getElementById("call-partner-name");
const callDurationTimer = document.getElementById("call-duration-timer");
const btnToggleAudio = document.getElementById("btn-toggle-audio");
const btnToggleVideo = document.getElementById("btn-toggle-video");
const btnShareScreen = document.getElementById("btn-share-screen");
const btnToggleChat = document.getElementById("btn-toggle-chat");
const btnHangup = document.getElementById("btn-hangup");

const callChatSidebar = document.getElementById("call-chat-sidebar");
const btnCloseChat = document.getElementById("btn-close-chat");
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatSendForm = document.getElementById("chat-send-form");
const chatMessageInput = document.getElementById("chat-message-input");
const chatNotificationBadge = document.getElementById("chat-notification-badge");

// Application State
let currentUser = null;
let currentIncomingCallId = null;
let contacts = [];
let selectedContact = null;
let callTimer = null;
let callDurationSeconds = 0;
let isAudioMuted = false;
let isVideoDisabled = false;
let isScreenSharing = false;
let activeScreenStream = null;
let isChatOpen = false;
let unreadChatCount = 0;

// Guest Mode DOM Elements
const guestView = document.getElementById("guest-view");
const guestSetupPanel = document.getElementById("guest-setup-panel");
const guestLinkPanel = document.getElementById("guest-link-panel");
const guestJoinPanel = document.getElementById("guest-join-panel");
const btnGuestMode = document.getElementById("btn-guest-mode");
const btnCreateGuestRoom = document.getElementById("btn-create-guest-room");
const btnBackToLogin = document.getElementById("btn-back-to-login");
const guestRoomLinkInput = document.getElementById("guest-room-link-input");
const btnCopyGuestLink = document.getElementById("btn-copy-guest-link");
const btnStartGuestCall = document.getElementById("btn-start-guest-call");
const btnCancelGuestRoom = document.getElementById("btn-cancel-guest-room");
const guestInvitedRoomId = document.getElementById("guest-invited-room-id");
const btnJoinGuestCall = document.getElementById("btn-join-guest-call");
const btnRejectGuestCall = document.getElementById("btn-reject-guest-call");

// Guest Mode Call State
let isGuestCall = false;
let guestRoomId = null;
let isGuestHost = false;

// Listeners unsubscribe tokens
let usersListener = null;
let incomingCallsListener = null;
let myContactUids = new Set();
let contactsListener = null;
let blockedUids = new Set();
let blockedListener = null;

// ==========================================================================
// 1. ROUTING & STATE TRANSITIONS
// ==========================================================================
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

window.switchAuthTab = function(tab) {
  authErrorMsg.textContent = "";
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.add("active-form");
    registerForm.classList.remove("active-form");
  } else {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    loginForm.classList.remove("active-form");
    registerForm.classList.add("active-form");
  }
};

// ==========================================================================
// 2. AUTHENTICATION FLOW
// ==========================================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMsg.textContent = "";
  loginSpinner.classList.remove("hidden");
  
  try {
    await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
  } catch (err) {
    console.error("Login Error:", err);
    authErrorMsg.textContent = formatAuthError(err.code);
  } finally {
    loginSpinner.classList.add("hidden");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMsg.textContent = "";
  registerSpinner.classList.remove("hidden");

  try {
    const cred = await createUserWithEmailAndPassword(auth, registerEmailInput.value, registerPasswordInput.value);
    await updateProfile(cred.user, {
      displayName: registerNameInput.value
    });
    // Force trigger update
    onUserLoggedIn(cred.user);
  } catch (err) {
    console.error("Registration Error:", err);
    authErrorMsg.textContent = formatAuthError(err.code);
  } finally {
    registerSpinner.classList.add("hidden");
  }
});

btnSignout.addEventListener("click", () => {
  setPresence("offline").then(() => {
    signOut(auth);
  });
});

function formatAuthError(code) {
  switch (code) {
    case "auth/invalid-email": return "Invalid email address format.";
    case "auth/user-disabled": return "This user account has been disabled.";
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/email-already-in-use": return "This email is already registered.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    default: return "An authentication error occurred. Please try again.";
  }
}

// Track Auth State Changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    onUserLoggedIn(user);
  } else {
    onUserLoggedOut();
  }
});

// ==========================================================================
// 3. PRESENCE & REALTIME DATABASE SYNC
// ==========================================================================
async function setPresence(status) {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || currentUser.email.split("@")[0],
      status: status,
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Error setting presence status:", err);
  }
}

// Set offline status on tab closure
window.addEventListener("beforeunload", () => {
  if (currentUser) {
    // Attempt to update status synchronously via sendBeacon or standard async call
    // Firestore async writes might get cut off but standard update is best effort here
    setPresence("offline");
  }
});

function onUserLoggedIn(user) {
  currentUser = user;
  userDisplayName.textContent = user.displayName || user.email;
  
  // Intercept and route to guest panel if invited via room parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  if (roomParam) {
    showView("guest-view");
    guestSetupPanel.classList.add("hidden");
    guestLinkPanel.classList.add("hidden");
    guestJoinPanel.classList.remove("hidden");
    guestInvitedRoomId.textContent = roomParam.toUpperCase();
    guestRoomId = roomParam;
    isGuestHost = false;
    btnRejectGuestCall.textContent = "Decline & Go to Dashboard";
  } else {
    showView("dashboard-view");
  }
  
  // Set presence to online
  setPresence("online");
  
  // Start listeners
  startUsersPresenceListener();
  startIncomingCallsListener();
}

function onUserLoggedOut() {
  // Clean up variables & UI
  currentUser = null;
  contacts = [];
  selectedContact = null;
  welcomePanel.classList.remove("hidden");
  contactDetailsPanel.classList.add("hidden");
  cleanUpCall();
  stopListeners();
  
  // Intercept and route to guest panel if invited via room parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  if (roomParam) {
    showView("guest-view");
    guestSetupPanel.classList.remove("hidden");
    guestSetupPanel.classList.add("hidden"); // Ensure correct layout visibility
    guestLinkPanel.classList.add("hidden");
    guestJoinPanel.classList.remove("hidden");
    guestInvitedRoomId.textContent = roomParam.toUpperCase();
    guestRoomId = roomParam;
    isGuestHost = false;
  } else {
    showView("auth-view");
  }
}

function stopListeners() {
  if (blockedListener) {
    blockedListener();
    blockedListener = null;
  }
  if (contactsListener) {
    contactsListener();
    contactsListener = null;
  }
  if (usersListener) {
    usersListener();
    usersListener = null;
  }
  if (incomingCallsListener) {
    incomingCallsListener();
    incomingCallsListener = null;
  }
}

// ==========================================================================
// 4. USERS PRESENCE LISTENER & SEARCH FILTER
// ==========================================================================
function startUsersPresenceListener() {
  const myContactsQuery = collection(db, "users", currentUser.uid, "contacts");
  const myBlockedQuery = collection(db, "users", currentUser.uid, "blocked");
  
  // Listen to blocked users list
  blockedListener = onSnapshot(myBlockedQuery, (blockedSnapshot) => {
    blockedUids.clear();
    blockedSnapshot.forEach((doc) => {
      blockedUids.add(doc.id);
    });
    
    // Once blocked list is loaded/updated, listen to contacts list
    if (!contactsListener) {
      contactsListener = onSnapshot(myContactsQuery, (contactsSnapshot) => {
        myContactUids.clear();
        contactsSnapshot.forEach((doc) => {
          myContactUids.add(doc.id);
        });
        runUsersListener();
      });
    } else {
      // Re-trigger rendering
      runUsersListener();
    }
  });
}

function runUsersListener() {
  if (usersListener) {
    renderContactsList();
    return;
  }

  const usersQuery = collection(db, "users");
  usersListener = onSnapshot(usersQuery, (snapshot) => {
    contacts = [];
    snapshot.forEach((doc) => {
      const userData = doc.data();
      // Exclude self, filter by contact list, AND exclude blocked UIDs
      if (
        userData.uid !== currentUser.uid && 
        myContactUids.has(userData.uid) && 
        !blockedUids.has(userData.uid)
      ) {
        contacts.push(userData);
      }
    });

    // Update selectedContact real-time status in details panel if open
    if (selectedContact) {
      const updatedContact = contacts.find(c => c.uid === selectedContact.uid);
      if (updatedContact) {
        selectedContact = updatedContact;
        detailName.textContent = updatedContact.displayName;
        detailEmail.textContent = updatedContact.email;
        const isOnline = updatedContact.status === "online";
        detailStatus.textContent = updatedContact.status;
        detailStatus.className = `contact-status-text ${isOnline ? 'online' : 'offline'}`;
        detailStatus.style.color = isOnline ? "var(--success)" : "var(--text-muted)";
      } else {
        selectedContact = null;
        welcomePanel.classList.remove("hidden");
        contactDetailsPanel.classList.add("hidden");
      }
    }

    renderContactsList();
  });
}

function renderContactsList() {
  const searchTerm = contactSearch.value.toLowerCase();
  const filteredContacts = contacts.filter(contact => 
    contact.displayName.toLowerCase().includes(searchTerm) || 
    contact.email.toLowerCase().includes(searchTerm)
  );

  // Sort: online first, then offline
  filteredContacts.sort((a, b) => {
    if (a.status === "online" && b.status !== "online") return -1;
    if (a.status !== "online" && b.status === "online") return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  // Count online users
  const onlineCount = filteredContacts.filter(c => c.status === "online").length;
  onlineCounter.textContent = `${onlineCount} online`;

  if (filteredContacts.length === 0) {
    contactsListContainer.innerHTML = `<li class="contact-placeholder">No contacts found</li>`;
    if (selectedContact) {
      selectedContact = null;
      welcomePanel.classList.remove("hidden");
      contactDetailsPanel.classList.add("hidden");
    }
    return;
  }

  // If selected contact is no longer in filtered list, hide details panel
  if (selectedContact && !filteredContacts.some(c => c.uid === selectedContact.uid)) {
    selectedContact = null;
    welcomePanel.classList.remove("hidden");
    contactDetailsPanel.classList.add("hidden");
  }

  contactsListContainer.innerHTML = filteredContacts.map(contact => {
    const isOnline = contact.status === "online";
    const statusClass = isOnline ? "online" : "offline";
    const avatarLetter = (contact.displayName || "?").charAt(0).toUpperCase();
    
    return `
      <li class="contact-item" data-uid="${contact.uid}" style="border: 1px solid transparent;">
        <div class="contact-item-info">
          <div class="contact-avatar">
            ${avatarLetter}
            <div class="contact-status-dot ${statusClass}"></div>
          </div>
          <div class="contact-details">
            <span class="contact-name">${contact.displayName}</span>
            <span class="contact-status-text">${contact.status}</span>
          </div>
        </div>
      </li>
    `;
  }).join("");

  // Add click listeners to Contact items
  contactsListContainer.querySelectorAll(".contact-item").forEach(item => {
    item.addEventListener("click", () => {
      const uid = item.getAttribute("data-uid");
      const contact = contacts.find(c => c.uid === uid);
      if (contact) {
        selectContact(contact);
      }
    });
  });

  // Keep selection highlighted if selectedContact exists
  if (selectedContact) {
    const activeItem = contactsListContainer.querySelector(`.contact-item[data-uid="${selectedContact.uid}"]`);
    if (activeItem) {
      activeItem.style.background = "rgba(255, 255, 255, 0.05)";
      activeItem.style.borderColor = "rgba(255, 255, 255, 0.08)";
    }
  }
}

contactSearch.addEventListener("input", renderContactsList);

// Add Contact form submission
addContactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addContactFeedback.className = "add-contact-feedback";
  addContactFeedback.textContent = "";

  const email = addContactEmail.value.trim().toLowerCase();
  if (!email) return;

  if (email === currentUser.email.toLowerCase()) {
    addContactFeedback.classList.add("error");
    addContactFeedback.textContent = "You cannot add yourself.";
    return;
  }

  try {
    // Search user by email in Firestore
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      addContactFeedback.classList.add("error");
      addContactFeedback.textContent = "No user found with this email.";
      return;
    }

    let targetUser = null;
    querySnapshot.forEach((doc) => {
      targetUser = doc.data();
    });

    // Check if user is already added
    if (myContactUids.has(targetUser.uid)) {
      addContactFeedback.classList.add("error");
      addContactFeedback.textContent = "Contact is already in your list.";
      return;
    }

    // Add targetUser to current user's contacts subcollection
    const contactRef = doc(db, "users", currentUser.uid, "contacts", targetUser.uid);
    await setDoc(contactRef, {
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: targetUser.displayName,
      addedAt: serverTimestamp()
    });

    addContactFeedback.classList.add("success");
    addContactFeedback.textContent = "Contact added successfully!";
    addContactEmail.value = "";

    setTimeout(() => {
      if (addContactFeedback.textContent === "Contact added successfully!") {
        addContactFeedback.textContent = "";
      }
    }, 3000);

  } catch (err) {
    console.error("Error adding contact:", err);
    addContactFeedback.classList.add("error");
    addContactFeedback.textContent = "Failed to add contact.";
  }
});

// ==========================================================================
// 5. CALL LIFE CYCLE MANAGEMENT
// ==========================================================================

// --- OUTGOING CALLS ---
async function initiateOutgoingCall(targetContact) {
  // Update status to busy
  setPresence("busy");

  // Show Outgoing UI Overlay
  outgoingCalleeName.textContent = targetContact.displayName;
  outgoingCalleeEmail.textContent = targetContact.email;
  outgoingCallCard.classList.remove("hidden");
  incomingCallCard.classList.add("hidden");
  callOverlay.classList.add("active");
  
  // Play dialing ringing audio sound
  audioRinging.play().catch(e => console.log("Sound autoplay blocked:", e));

  try {
    await startCall(currentUser, targetContact);
  } catch (err) {
    alert("Could not start WebRTC call session: " + err.message);
    endActiveCallUI();
  }
}

btnCancelCall.addEventListener("click", () => {
  hangUpCall().then(() => {
    endActiveCallUI();
  });
});

// --- INCOMING CALLS ---
function startIncomingCallsListener() {
  const callsQuery = query(
    collection(db, "calls"),
    where("calleeId", "==", currentUser.uid),
    where("status", "==", "ringing")
  );

  incomingCallsListener = onSnapshot(callsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const callData = change.doc.data();
        const callId = change.doc.id;
        
        // Auto-decline if caller is blocked
        if (blockedUids.has(callData.callerId)) {
          declineCall(callId);
          return;
        }
        
        currentIncomingCallId = callId;
        showIncomingCallUI(callData);
      }
    });
  });
}

function showIncomingCallUI(callData) {
  // Update status to busy
  setPresence("busy");

  incomingCallerName.textContent = callData.callerName;
  incomingCallerEmail.textContent = callData.callerEmail || "";
  incomingCallCard.classList.remove("hidden");
  outgoingCallCard.classList.add("hidden");
  callOverlay.classList.add("active");
  
  // Play ringtone audio sound
  audioRinging.play().catch(e => console.log("Sound autoplay blocked:", e));
}

btnDeclineCall.addEventListener("click", () => {
  if (currentIncomingCallId) {
    declineCall(currentIncomingCallId).then(() => {
      endActiveCallUI();
    });
  }
});

btnAcceptCall.addEventListener("click", async () => {
  if (!currentIncomingCallId) return;
  
  audioRinging.pause();
  audioRinging.currentTime = 0;
  
  callOverlay.classList.remove("active");
  showView("call-room-view");
  callPartnerName.textContent = incomingCallerName.textContent;

  try {
    const { localStream, remoteStream } = await acceptCall(currentIncomingCallId, currentUser.uid);
    localVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
    
    startCallTimer();
  } catch (err) {
    alert("Failed to establish peer-to-peer connection: " + err.message);
    hangUpCall().then(() => {
      endActiveCallUI();
    });
  }
});

// --- CALL STATE ENGINE CALLBACKS FROM WEBRTC.JS ---
registerCallbacks({
  onCallAccepted: () => {
    // Triggered on the caller's side when the callee answers the call
    audioRinging.pause();
    audioRinging.currentTime = 0;
    
    callOverlay.classList.remove("active");
    showView("call-room-view");
    callPartnerName.textContent = outgoingCalleeName.textContent;
    
    // Set video sources
    // local/remote streams are accessible on client
    // Since webrtc.js triggers track updates, we handle it below in onRemoteStream
    startCallTimer();
  },
  
  onCallEnded: (reason) => {
    endActiveCallUI();
    if (reason === "declined") {
      alert("The contact declined your video call.");
    }
  },
  
  onRemoteStream: (stream) => {
    remoteVideo.srcObject = stream;
    // Bind local stream as well if not already bound
    // Import helper stream
    // localStream is already gathered inside startCall
  },

  onChatMessage: (messageData) => {
    renderChatMessage(messageData);
    if (!isChatOpen) {
      unreadChatCount++;
      chatNotificationBadge.classList.remove("hidden");
    }
  },

  onError: (errorMsg) => {
    alert(errorMsg);
    endActiveCallUI();
  }
});

// Bind local video element updates (required for caller side)
// We monitor when local media starts or fails
window.addEventListener("click", () => {
  // Safe init check
});

// End call and restore interface state
function endActiveCallUI() {
  audioRinging.pause();
  audioRinging.currentTime = 0;
  
  callOverlay.classList.remove("active");
  showView("dashboard-view");
  
  if (selectedContact) {
    loadContactCallHistory(selectedContact.uid);
  } else {
    welcomePanel.classList.remove("hidden");
    contactDetailsPanel.classList.add("hidden");
  }
  
  // Restore presence
  setPresence("online");
  
  // Reset video DOM elements
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  
  // Stop call timer
  stopCallTimer();
  
  // Restore controls status
  isAudioMuted = false;
  isVideoDisabled = false;
  btnToggleAudio.classList.remove("active");
  btnToggleVideo.classList.remove("active");
  
  if (isScreenSharing) {
    stopScreenSharingTrack();
  }

  // Clear chat panel
  chatMessagesContainer.innerHTML = "";
  chatNotificationBadge.classList.add("hidden");
  unreadChatCount = 0;
  isChatOpen = false;
  callChatSidebar.classList.add("hidden");
  
  outgoingCalleeEmail.textContent = "";
  incomingCallerEmail.textContent = "";
  currentIncomingCallId = null;
  cleanUpCall();
}

btnHangup.addEventListener("click", () => {
  if (isGuestCall) {
    hangUpGuestCall().then(() => {
      endActiveGuestCallUI();
    });
  } else {
    hangUpCall(callDurationSeconds).then(() => {
      endActiveCallUI();
    });
  }
});

// ==========================================================================
// 6. CALL ROOM UTILITIES (MUTING, CAMERA, SCREEN SHARE, CHAT)
// ==========================================================================

// Timer
function startCallTimer() {
  callDurationSeconds = 0;
  callDurationTimer.textContent = "00:00";
  
  // Bind active local stream to local preview video element
  const stream = getLocalStream();
  if (stream) {
    localVideo.srcObject = stream;
  }

  callTimer = setInterval(() => {
    callDurationSeconds++;
    const mins = Math.floor(callDurationSeconds / 60).toString().padStart(2, '0');
    const secs = (callDurationSeconds % 60).toString().padStart(2, '0');
    callDurationTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopCallTimer() {
  if (callTimer) {
    clearInterval(callTimer);
    callTimer = null;
  }
}

// Mute/Camera Toggles
btnToggleAudio.addEventListener("click", () => {
  isAudioMuted = !isAudioMuted;
  if (isGuestCall) {
    toggleGuestAudio(isAudioMuted);
  } else {
    toggleAudio(isAudioMuted);
  }
  
  if (isAudioMuted) {
    btnToggleAudio.classList.add("active");
    btnToggleAudio.querySelector(".icon-mic").classList.add("hidden");
    btnToggleAudio.querySelector(".icon-mic-off").classList.remove("hidden");
  } else {
    btnToggleAudio.classList.remove("active");
    btnToggleAudio.querySelector(".icon-mic").classList.remove("hidden");
    btnToggleAudio.querySelector(".icon-mic-off").classList.add("hidden");
  }
});

btnToggleVideo.addEventListener("click", () => {
  isVideoDisabled = !isVideoDisabled;
  if (isGuestCall) {
    toggleGuestVideo(isVideoDisabled);
  } else {
    toggleVideo(isVideoDisabled);
  }
  
  if (isVideoDisabled) {
    btnToggleVideo.classList.add("active");
    btnToggleVideo.querySelector(".icon-video").classList.add("hidden");
    btnToggleVideo.querySelector(".icon-video-off").classList.remove("hidden");
    localVideo.classList.add("hidden");
  } else {
    btnToggleVideo.classList.remove("active");
    btnToggleVideo.querySelector(".icon-video").classList.remove("hidden");
    btnToggleVideo.querySelector(".icon-video-off").classList.remove("hidden");
    localVideo.classList.remove("hidden");
  }
});

// Screen Sharing
btnShareScreen.addEventListener("click", async () => {
  try {
    if (!isScreenSharing) {
      const stream = isGuestCall
        ? await toggleGuestScreenShare(true, () => {
            isScreenSharing = false;
            btnShareScreen.classList.remove("active");
          })
        : await toggleScreenShare(true, () => {
            isScreenSharing = false;
            btnShareScreen.classList.remove("active");
          });
      if (stream) {
        activeScreenStream = stream;
        isScreenSharing = true;
        btnShareScreen.classList.add("active");
      }
    } else {
      stopScreenSharingTrack();
    }
  } catch (err) {
    console.error("Screen share handler failed:", err);
  }
});

function stopScreenSharingTrack() {
  if (activeScreenStream) {
    activeScreenStream.getTracks().forEach(t => t.stop());
    activeScreenStream = null;
  }
  if (isGuestCall) {
    toggleGuestScreenShare(false);
  } else {
    toggleScreenShare(false);
  }
  isScreenSharing = false;
  btnShareScreen.classList.remove("active");
}

// Call Chat panel toggle
btnToggleChat.addEventListener("click", () => {
  isChatOpen = !isChatOpen;
  if (isChatOpen) {
    callChatSidebar.classList.remove("hidden");
    btnToggleChat.classList.add("active");
    chatNotificationBadge.classList.add("hidden");
    unreadChatCount = 0;
    
    // Auto scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  } else {
    callChatSidebar.classList.add("hidden");
    btnToggleChat.classList.add("active");
  }
});

btnCloseChat.addEventListener("click", () => {
  isChatOpen = false;
  callChatSidebar.classList.add("hidden");
  btnToggleChat.classList.remove("active");
});

// Send Chat Message
chatSendForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatMessageInput.value.trim();
  if (text) {
    if (isGuestCall) {
      const senderRole = isGuestHost ? "Host" : "Guest";
      sendGuestChatMessage(senderRole, text);
      renderChatMessage({ senderUid: senderRole, text: text, senderName: senderRole });
    } else {
      sendChatMessage(currentUser.uid, text);
    }
    chatMessageInput.value = "";
  }
});

// Render Chat Message
function renderChatMessage(msg) {
  const isSent = isGuestCall 
    ? (msg.senderUid === (isGuestHost ? "Host" : "Guest"))
    : (msg.senderUid === (currentUser ? currentUser.uid : null));
  const msgClass = isSent ? "sent" : "received";
  
  const div = document.createElement("div");
  div.className = `chat-msg ${msgClass}`;
  
  if (isGuestCall && !isSent) {
    const senderSpan = document.createElement("strong");
    senderSpan.style.display = "block";
    senderSpan.style.fontSize = "0.75rem";
    senderSpan.style.color = "var(--primary)";
    senderSpan.style.marginBottom = "3px";
    senderSpan.textContent = msg.senderName || "Partner";
    div.appendChild(senderSpan);
  }
  
  const textSpan = document.createElement("span");
  textSpan.textContent = msg.text;
  div.appendChild(textSpan);
  
  chatMessagesContainer.appendChild(div);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// ==========================================================================
// 7. SELECTED CONTACT ACTIONS
// ==========================================================================
function selectContact(contact) {
  selectedContact = contact;
  
  // Highlight active contact in sidebar
  contactsListContainer.querySelectorAll(".contact-item").forEach(item => {
    if (item.getAttribute("data-uid") === contact.uid) {
      item.style.background = "rgba(255, 255, 255, 0.05)";
      item.style.borderColor = "rgba(255, 255, 255, 0.08)";
    } else {
      item.style.background = "transparent";
      item.style.borderColor = "transparent";
    }
  });

  // Populate Contact Details panel
  detailName.textContent = contact.displayName;
  detailEmail.textContent = contact.email;
  detailAvatar.textContent = (contact.displayName || "?").charAt(0).toUpperCase();
  
  const isOnline = contact.status === "online";
  detailStatus.textContent = contact.status;
  detailStatus.className = `contact-status-text ${isOnline ? 'online' : 'offline'}`;
  detailStatus.style.color = isOnline ? "var(--success)" : "var(--text-muted)";

  // Show details panel
  welcomePanel.classList.add("hidden");
  contactDetailsPanel.classList.remove("hidden");

  // Load call history specific to this contact
  loadContactCallHistory(contact.uid);
}

btnDetailCall.addEventListener("click", () => {
  if (selectedContact) {
    initiateOutgoingCall(selectedContact);
  }
});

btnDetailBlock.addEventListener("click", () => {
  if (selectedContact) {
    blockUser(selectedContact);
  }
});

// ==========================================================================
// 8. SETTINGS MODAL INTERACTION
// ==========================================================================
btnSettings.addEventListener("click", () => {
  settingsDisplayName.value = currentUser.displayName || "";
  settingsFeedback.textContent = "";
  deleteFeedback.textContent = "";
  settingsModal.classList.add("active");
  switchSettingsTab("profile");
});

btnCloseSettings.addEventListener("click", () => {
  settingsModal.classList.remove("active");
});

// Attach event listeners for Settings tabs (JS side to avoid inline issues)
settingsTabProfile.addEventListener("click", () => switchSettingsTab("profile"));
settingsTabBlocked.addEventListener("click", () => switchSettingsTab("blocked"));

window.switchSettingsTab = function(tab) {
  const tabProfile = document.getElementById("settings-tab-profile");
  const tabBlocked = document.getElementById("settings-tab-blocked");
  const panelProfile = document.getElementById("panel-profile");
  const panelBlocked = document.getElementById("panel-blocked");

  if (tab === "profile") {
    tabProfile.classList.add("active");
    tabBlocked.classList.remove("active");
    panelProfile.classList.add("active");
    panelBlocked.classList.remove("active");
    panelProfile.style.display = "";
    panelBlocked.style.display = "";
  } else {
    tabProfile.classList.remove("active");
    tabBlocked.classList.add("active");
    panelProfile.classList.remove("active");
    panelBlocked.classList.add("active");
    panelProfile.style.display = "";
    panelBlocked.style.display = "";
    loadBlockedList();
  }
};

profileSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  settingsFeedback.className = "settings-feedback";
  settingsFeedback.textContent = "";
  
  const newName = settingsDisplayName.value.trim();
  if (!newName) return;
  
  try {
    await updateProfile(currentUser, { displayName: newName });
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { displayName: newName });
    
    userDisplayName.textContent = newName;
    settingsFeedback.classList.add("success");
    settingsFeedback.textContent = "Profile updated successfully!";
  } catch (err) {
    console.error("Error updating profile settings:", err);
    settingsFeedback.classList.add("error");
    settingsFeedback.textContent = "Failed to update profile settings.";
  }
});

btnDeleteAccount.addEventListener("click", async () => {
  if (!confirm("WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.")) return;
  if (!confirm("FINAL CONFIRMATION: All your profile data, contacts, and call history logs will be deleted. Proceed?")) return;
  
  deleteFeedback.textContent = "";
  
  try {
    const uid = currentUser.uid;
    await setPresence("offline");
    stopListeners();
    
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
    await currentUser.delete();
    
    alert("Your account has been deleted successfully.");
    onUserLoggedOut();
  } catch (err) {
    console.error("Error deleting account:", err);
    if (err.code === "auth/requires-recent-login") {
      deleteFeedback.textContent = "Please sign out and sign in again before deleting your account.";
    } else {
      deleteFeedback.textContent = "Failed to delete account: " + err.message;
    }
  }
});

// ==========================================================================
// 9. BLOCKING, UNBLOCKING & HISTORY LOGS LOGIC
// ==========================================================================
async function blockUser(contact) {
  if (!confirm(`Are you sure you want to block ${contact.displayName}?`)) return;
  try {
    const blockRef = doc(db, "users", currentUser.uid, "blocked", contact.uid);
    await setDoc(blockRef, {
      uid: contact.uid,
      displayName: contact.displayName,
      email: contact.email,
      blockedAt: serverTimestamp()
    });
    alert(`${contact.displayName} has been blocked.`);
    
    // If selectedContact is blocked, close the details panel
    if (selectedContact && selectedContact.uid === contact.uid) {
      selectedContact = null;
      welcomePanel.classList.remove("hidden");
      contactDetailsPanel.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error blocking user:", err);
    alert("Failed to block contact.");
  }
}

async function unblockUser(blockedUser) {
  try {
    const blockRef = doc(db, "users", currentUser.uid, "blocked", blockedUser.uid);
    await deleteDoc(blockRef);
    alert(`${blockedUser.displayName} has been unblocked.`);
    loadBlockedList();
  } catch (err) {
    console.error("Error unblocking user:", err);
    alert("Failed to unblock user.");
  }
}

async function loadBlockedList() {
  blockedUsersList.innerHTML = `<li class="contact-placeholder">Loading...</li>`;
  
  try {
    const q = collection(db, "users", currentUser.uid, "blocked");
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      blockedUsersList.innerHTML = `<li class="contact-placeholder">No blocked users</li>`;
      return;
    }
    
    let html = "";
    querySnapshot.forEach((doc) => {
      const blockedData = doc.data();
      const blockedUid = doc.id;
      const blockedName = blockedData.displayName || blockedData.email || "Unknown";
      const blockedEmail = blockedData.email || "";
      
      html += `
        <li class="blocked-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border-light)">
          <div class="blocked-item-info">
            <span class="blocked-item-name" style="font-size:0.9rem; font-weight:500;">${blockedName}</span>
            <span class="blocked-item-email" style="font-size:0.75rem; color:var(--text-muted);">${blockedEmail}</span>
          </div>
          <button class="btn btn-secondary btn-sm btn-unblock" data-uid="${blockedUid}" data-name="${blockedName}">Unblock</button>
        </li>
      `;
    });
    
    blockedUsersList.innerHTML = html;
    
    blockedUsersList.querySelectorAll(".btn-unblock").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-uid");
        const name = btn.getAttribute("data-name");
        if (uid) {
          unblockUser({ uid: uid, displayName: name });
        }
      });
    });
  } catch (err) {
    console.error("Error loading blocked list:", err);
    blockedUsersList.innerHTML = `<li class="contact-placeholder" style="color:var(--danger)">Failed to load</li>`;
  }
}

// Robust helpers to extract milliseconds from any kind of timestamp or date representation
function getTimestampMs(field) {
  if (!field) return 0;
  if (typeof field.toMillis === "function") return field.toMillis();
  if (typeof field.toDate === "function") return field.toDate().getTime();
  if (field.seconds) return field.seconds * 1000 + (field.nanoseconds || 0) / 1000000;
  if (field instanceof Date) return field.getTime();
  const parsed = Date.parse(field);
  return isNaN(parsed) ? 0 : parsed;
}

// Robust helper to get a JS Date object from any kind of timestamp representation
function getTimestampDate(field) {
  if (!field) return new Date();
  if (typeof field.toDate === "function") return field.toDate();
  if (typeof field.toMillis === "function") return new Date(field.toMillis());
  if (field.seconds) return new Date(field.seconds * 1000);
  if (field instanceof Date) return field;
  const parsed = new Date(field);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// WhatsApp-style relative date and time formatter
function formatRelativeTime(date) {
  const now = new Date();
  
  // Strip hours/minutes/seconds to get raw date differences
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today - compareDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0) {
    return `Today, ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  } else if (diffDays < 7 && diffDays > 0) {
    const weekday = date.toLocaleDateString([], { weekday: 'long' });
    return `${weekday}, ${timeStr}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
  }
}

// Format call duration in a human-friendly way (e.g. 5m 23s)
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

async function loadContactCallHistory(contactUid) {
  detailHistoryList.innerHTML = `<li class="contact-placeholder">Loading history...</li>`;

  try {
    const callerQuery = query(
      collection(db, "calls"),
      where("callerId", "==", currentUser.uid)
    );
    const calleeQuery = query(
      collection(db, "calls"),
      where("calleeId", "==", currentUser.uid)
    );

    const [callerSnapshot, calleeSnapshot] = await Promise.all([
      getDocs(callerQuery),
      getDocs(calleeQuery)
    ]);

    let rawCalls = [];
    callerSnapshot.forEach((doc) => {
      rawCalls.push({ id: doc.id, ...doc.data() });
    });
    calleeSnapshot.forEach((doc) => {
      rawCalls.push({ id: doc.id, ...doc.data() });
    });

    // Filter calls strictly between currentUser and selected contactUid
    const filteredCalls = rawCalls.filter(call => 
      (call.callerId === currentUser.uid && call.calleeId === contactUid) ||
      (call.callerId === contactUid && call.calleeId === currentUser.uid)
    );

    filteredCalls.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));

    const recentCalls = filteredCalls.slice(0, 5);

    if (recentCalls.length === 0) {
      detailHistoryList.innerHTML = `<li class="contact-placeholder">No call history with this contact.</li>`;
      return;
    }

    let html = "";
    recentCalls.forEach((call) => {
      const isOutgoing = call.callerId === currentUser.uid;
      
      let badgeClass = "cancelled";
      let badgeText = "Cancelled";
      let statusDetailsText = "No connection";
      
      if (call.status === "declined") {
        badgeClass = "declined";
        badgeText = "Declined";
        statusDetailsText = isOutgoing ? "Declined by recipient" : "Declined by you";
      } else if (call.answer) {
        badgeClass = "completed";
        badgeText = "Answered";
        const durationText = call.duration ? formatDuration(call.duration) : "0s";
        statusDetailsText = `Talked for ${durationText}`;
      } else if (call.status === "ended" && !call.answer) {
        if (isOutgoing) {
          badgeClass = "cancelled";
          badgeText = "Cancelled";
          statusDetailsText = "Cancelled by you";
        } else {
          badgeClass = "missed";
          badgeText = "Missed";
          statusDetailsText = "Missed call";
        }
      } else if (call.status === "ringing") {
        badgeClass = "outgoing";
        badgeText = "Ringing";
        statusDetailsText = "Calling...";
      }

      let formattedTime = "Recent";
      if (call.createdAt) {
        try {
          const date = getTimestampDate(call.createdAt);
          formattedTime = formatRelativeTime(date);
        } catch (e) {
          console.warn("Error formatting date:", e);
        }
      }

      html += `
        <li class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; margin-bottom:8px; background:rgba(255,255,255,0.01); border-radius:10px; border:1px solid var(--border-light)">
          <div class="history-item-details" style="display:flex; flex-direction:column; max-width:70%;">
            <span class="history-item-partner" style="font-size:0.85rem; font-weight:500; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
              <span style="color:${isOutgoing ? 'var(--primary)' : 'var(--success)'}; font-size:1.1rem; font-weight:700;">
                ${isOutgoing ? '↗' : '↙'}
              </span>
              ${isOutgoing ? 'You called ' + selectedContact.displayName : selectedContact.displayName + ' called you'}
            </span>
            <span class="history-item-time" style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${formattedTime}</span>
          </div>
          <div class="history-item-status" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="history-badge ${badgeClass}">${badgeText}</span>
            <span class="history-duration" style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">${statusDetailsText}</span>
          </div>
        </li>
      `;
    });

    detailHistoryList.innerHTML = html;
  } catch (err) {
    console.error("Error loading call history:", err);
    detailHistoryList.innerHTML = `<li class="contact-placeholder" style="color:var(--danger)">Failed to load logs</li>`;
  }
}

// ==========================================================================
// 10. GUEST CALL SESSION CONTROLLERS (SUPABASE REALTIME)
// ==========================================================================

async function initiateGuestCallSession() {
  isGuestCall = true;
  showView("call-room-view");
  callPartnerName.textContent = "Connecting...";
  
  try {
    await startGuestCall(guestRoomId, isGuestHost, localVideo, remoteVideo, {
      onCallAccepted: () => {
        startCallTimer();
        callPartnerName.textContent = isGuestHost ? "Guest Partner" : "Host Partner";
      },
      onCallEnded: () => {
        endActiveGuestCallUI();
      },
      onRemoteStream: (stream) => {
        remoteVideo.srcObject = stream;
      },
      onChatMessage: (msg) => {
        renderChatMessage({
          senderUid: msg.senderName,
          text: msg.text,
          senderName: msg.senderName
        });
        if (!isChatOpen) {
          unreadChatCount++;
          chatNotificationBadge.classList.remove("hidden");
        }
      },
      onError: (err) => {
        alert("Guest Call Error: " + err);
        endActiveGuestCallUI();
      }
    });
  } catch (err) {
    alert("Could not establish Supabase peer call: " + err.message);
    endActiveGuestCallUI();
  }
}

function endActiveGuestCallUI() {
  isGuestCall = false;
  
  // Reset video feeds
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  
  // Reset timer
  stopCallTimer();
  
  // Reset controls
  isAudioMuted = false;
  isVideoDisabled = false;
  btnToggleAudio.classList.remove("active");
  btnToggleVideo.classList.remove("active");
  
  if (isScreenSharing) {
    stopScreenSharingTrack();
  }
  
  // Reset chat sidebar
  chatMessagesContainer.innerHTML = "";
  chatNotificationBadge.classList.add("hidden");
  unreadChatCount = 0;
  isChatOpen = false;
  callChatSidebar.classList.add("hidden");
  
  cleanUpGuestCall();
  
  // Return to Guest Mode screen in appropriate state, or dashboard if logged in
  if (currentUser) {
    const url = new URL(window.location);
    url.searchParams.delete("room");
    window.history.pushState({}, "", url);
    btnRejectGuestCall.textContent = "Decline & Sign In";
    showView("dashboard-view");
  } else {
    showView("guest-view");
    if (isGuestHost) {
      guestSetupPanel.classList.add("hidden");
      guestLinkPanel.classList.remove("hidden");
      guestJoinPanel.classList.add("hidden");
    } else {
      guestSetupPanel.classList.add("hidden");
      guestLinkPanel.classList.add("hidden");
      guestJoinPanel.classList.remove("hidden");
    }
  }
}

// --- BUTTON LISTENERS ---

btnGuestMode.addEventListener("click", () => {
  showView("guest-view");
  guestSetupPanel.classList.remove("hidden");
  guestLinkPanel.classList.add("hidden");
  guestJoinPanel.classList.add("hidden");
});

btnBackToLogin.addEventListener("click", () => {
  // Clean room query parameter from url
  const url = new URL(window.location);
  url.searchParams.delete("room");
  window.history.pushState({}, "", url);
  
  if (currentUser) {
    showView("dashboard-view");
  } else {
    showView("auth-view");
  }
});

btnCreateGuestRoom.addEventListener("click", () => {
  guestRoomId = Math.random().toString(36).substring(2, 8);
  const url = window.location.origin + window.location.pathname + "?room=" + guestRoomId;
  
  guestRoomLinkInput.value = url;
  
  guestSetupPanel.classList.add("hidden");
  guestLinkPanel.classList.remove("hidden");
  isGuestHost = true;
});

btnCopyGuestLink.addEventListener("click", () => {
  navigator.clipboard.writeText(guestRoomLinkInput.value).then(() => {
    btnCopyGuestLink.textContent = "Copied!";
    setTimeout(() => {
      btnCopyGuestLink.textContent = "Copy";
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
});

btnStartGuestCall.addEventListener("click", () => {
  initiateGuestCallSession();
});

btnCancelGuestRoom.addEventListener("click", () => {
  guestRoomId = null;
  isGuestHost = false;
  guestLinkPanel.classList.add("hidden");
  guestSetupPanel.classList.remove("hidden");
});

btnJoinGuestCall.addEventListener("click", () => {
  initiateGuestCallSession();
});

btnRejectGuestCall.addEventListener("click", () => {
  // Clean room query parameter from url
  const url = new URL(window.location);
  url.searchParams.delete("room");
  window.history.pushState({}, "", url);
  btnRejectGuestCall.textContent = "Decline & Sign In";
  
  if (currentUser) {
    showView("dashboard-view");
  } else {
    showView("auth-view");
  }
});

