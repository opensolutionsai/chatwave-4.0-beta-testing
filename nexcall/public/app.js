// NexCall App Controller
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser
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
  deleteDoc,
  or
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
const addContactInput = document.getElementById("add-contact-input");
const addContactFeedback = document.getElementById("add-contact-feedback");
const registerPhoneInput = document.getElementById("register-phone");
const settingsPhoneInput = document.getElementById("settings-phone");
const btnGoogleSignin = document.getElementById("btn-google-signin");

// Selected Contact Detail view DOM references
const welcomePanel = document.getElementById("welcome-panel");
const contactDetailsPanel = document.getElementById("contact-details-panel");
const detailAvatar = document.getElementById("detail-avatar");
const detailName = document.getElementById("detail-name");
const detailEmail = document.getElementById("detail-email");
const detailStatus = document.getElementById("detail-status");
const btnDetailVoiceCall = document.getElementById("btn-detail-voice-call");
const btnDetailVideoCall = document.getElementById("btn-detail-video-call");
const btnDetailBlock = document.getElementById("btn-detail-block");
const btnDetailKeep = document.getElementById("btn-detail-keep");
const btnDetailRemove = document.getElementById("btn-detail-remove");
const detailHistoryList = document.getElementById("detail-history-list");
const btnCloseContactDetails = document.getElementById("btn-close-contact-details");

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
const avatarFileInput = document.getElementById("avatar-file-input");
const settingsAvatarContainer = document.getElementById("settings-avatar-container");
const avatarUploadStatus = document.getElementById("avatar-upload-status");

// Cloudinary configuration (unsigned upload)
const CLOUDINARY_CLOUD_NAME = "dogwrel9i";
const CLOUDINARY_UPLOAD_PRESET = "nexcall-profile";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
const localVideoContainer = document.getElementById("local-video-container");
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
let currentIncomingCallData = null;
let activeCallType = "video"; // tracks call type for the active/outgoing call
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
const btnCreateGuestVoice = document.getElementById("btn-create-guest-voice");
const btnCreateGuestVideo = document.getElementById("btn-create-guest-video");
const btnBackToLogin = document.getElementById("btn-back-to-login");
const guestRoomLinkInput = document.getElementById("guest-room-link-input");
const btnCopyGuestLink = document.getElementById("btn-copy-guest-link");
const btnStartGuestCall = document.getElementById("btn-start-guest-call");
const btnCancelGuestRoom = document.getElementById("btn-cancel-guest-room");
const guestInvitedRoomId = document.getElementById("guest-invited-room-id");
const btnJoinGuestCall = document.getElementById("btn-join-guest-call");
const btnRejectGuestCall = document.getElementById("btn-reject-guest-call");

// Dashboard Room Call DOM Elements
const dashboardRoomSetup = document.getElementById("dashboard-room-setup");
const dashboardRoomLinkPanel = document.getElementById("dashboard-room-link-panel");
const dashboardRoomLinkInput = document.getElementById("dashboard-room-link-input");
const btnCreateDashboardRoomVoice = document.getElementById("btn-create-dashboard-room-voice");
const btnCreateDashboardRoomVideo = document.getElementById("btn-create-dashboard-room-video");
const btnCopyDashboardRoomLink = document.getElementById("btn-copy-dashboard-room-link");
const btnStartDashboardRoomCall = document.getElementById("btn-start-dashboard-room-call");
const btnCancelDashboardRoom = document.getElementById("btn-cancel-dashboard-room");

// Guest Mode Call State
let isGuestCall = false;
let guestRoomId = null;
let isGuestHost = false;
let guestCallType = "video";

// Native Notifications State
let activeNotification = null;

// Listeners unsubscribe tokens
let usersListeners = [];
let incomingCallsListener = null;
let myContactUids = new Map();
let contactsListener = null;
let blockedUids = new Set();
let blockedListener = null;
let localCallHistory = [];
let callHistoryListener = null;

function stopUsersListeners() {
  usersListeners.forEach(unsub => unsub());
  usersListeners = [];
}

// ==========================================================================
// 1. ROUTING & STATE TRANSITIONS
// ==========================================================================
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

window.switchAuthTab = function (tab) {
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
    
    // Save optional phone number to Firestore
    const phoneVal = registerPhoneInput ? registerPhoneInput.value.trim() : "";
    if (phoneVal) {
      const userRef = doc(db, "users", cred.user.uid);
      await setDoc(userRef, {
        phone: phoneVal
      }, { merge: true });
    }

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

if (btnGoogleSignin) {
  btnGoogleSignin.addEventListener("click", async () => {
    authErrorMsg.textContent = "";
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      authErrorMsg.textContent = "Google Sign-In failed: " + err.message;
    }
  });
}

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
    const userData = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || currentUser.email.split("@")[0],
      status: status,
      lastActive: serverTimestamp()
    };

    if (currentUser.photoURL) {
      userData.photoURL = currentUser.photoURL;
    }

    await setDoc(userRef, userData, { merge: true });
  } catch (err) {
    console.error("Error setting presence status:", err);
  }
}

// Request permission for showing native OS notifications
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      console.log("Notification permission:", permission);
    });
  }
}

// Show native OS notification
function showLocalNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    if (activeNotification) {
      activeNotification.close();
    }
    activeNotification = new Notification(title, {
      body: body,
      icon: "favicon_io/apple-touch-icon.png",
      tag: "nexcall-call",
      requireInteraction: true
    });
    activeNotification.onclick = () => {
      window.focus();
      activeNotification.close();
      activeNotification = null;
    };
  }
}

// Register click gesture to request notifications permission safely
document.addEventListener("click", () => {
  requestNotificationPermission();
}, { once: true });

// ==========================================================================
// CLOUDINARY UPLOAD & AVATAR HELPERS
// ==========================================================================

/**
 * Upload a file to Cloudinary via unsigned upload preset.
 * Returns the secure_url of the uploaded image.
 */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "nexcall-profiles");

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Upload failed");
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Update the current user's avatar UI across the navbar and settings panel.
 */
function renderUserAvatar(photoURL) {
  // Navbar avatar
  const navImg = document.getElementById("nav-avatar-img");
  const navLetter = document.getElementById("nav-avatar-letter");
  if (navImg && photoURL) {
    navImg.src = photoURL;
    navImg.style.display = "block";
    if (navLetter) navLetter.style.display = "none";
  }
  // Settings avatar
  const settingsImg = document.getElementById("settings-avatar-img");
  const settingsLetter = document.getElementById("settings-avatar-letter");
  if (settingsImg && photoURL) {
    settingsImg.src = photoURL;
    settingsImg.style.display = "block";
    if (settingsLetter) settingsLetter.style.display = "none";
  }
}

/**
 * Render a contact's avatar in the detail panel.
 * Shows photo if available, else shows initial letter.
 */
function renderContactDetailAvatar(contact) {
  const avatarLetter = document.getElementById("detail-avatar-letter");
  const avatarImg = document.getElementById("detail-avatar-img");
  if (!avatarLetter || !avatarImg) return;

  const initial = (contact.displayName || "?").charAt(0).toUpperCase();

  if (contact.photoURL) {
    avatarImg.src = contact.photoURL;
    avatarImg.style.display = "block";
    avatarLetter.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarImg.src = "";
    avatarLetter.textContent = initial;
    avatarLetter.style.display = "";
  }
}

/**
 * Populate a call card's avatar circle with either a photo or initial letter.
 * @param {"outgoing"|"incoming"|"voice"} type  - which card to target
 * @param {string} displayName - contact/caller display name
 * @param {string|null} photoURL - photo URL or null for text avatar
 */
function setCallAvatar(type, displayName, photoURL) {
  const prefix = type === "voice" ? "voice" : (type === "outgoing" ? "outgoing" : "incoming");
  const letterEl = document.getElementById(`${prefix}-avatar-letter`);
  const imgEl    = document.getElementById(`${prefix}-avatar-img`);
  if (!letterEl || !imgEl) return;

  const initial = (displayName || "?").charAt(0).toUpperCase();

  if (photoURL) {
    imgEl.src = photoURL;
    imgEl.style.display = "block";
    letterEl.style.display = "none";
  } else {
    imgEl.style.display = "none";
    imgEl.src = "";
    letterEl.textContent = initial;
    letterEl.style.display = "";
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
  const displayName = user.displayName || user.email.split("@")[0];
  userDisplayName.textContent = displayName;

  // Set nav avatar letter
  const navLetter = document.getElementById("nav-avatar-letter");
  if (navLetter) navLetter.textContent = displayName.charAt(0).toUpperCase();

  // Load photo from Firestore user doc (may have been updated after registration)
  const userRef = doc(db, "users", user.uid);
  getDoc(userRef).then((snap) => {
    if (snap.exists()) {
      const userData = snap.data();
      if (userData.photoURL) {
        renderUserAvatar(userData.photoURL);
      }
    }
  }).catch(() => {});

  // Set settings avatar letter
  const settingsLetter = document.getElementById("settings-avatar-letter");
  if (settingsLetter) settingsLetter.textContent = displayName.charAt(0).toUpperCase();

  // Intercept and route to guest panel if invited via room parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  const typeParam = urlParams.get("type") || "video";
  guestCallType = typeParam;

  if (roomParam) {
    showView("guest-view");
    guestSetupPanel.classList.add("hidden");
    guestLinkPanel.classList.add("hidden");
    guestJoinPanel.classList.remove("hidden");
    guestInvitedRoomId.textContent = roomParam.toUpperCase();
    guestRoomId = roomParam;
    isGuestHost = false;
    btnRejectGuestCall.textContent = "Decline & Go to Dashboard";
    const joinBtn = document.getElementById("btn-join-guest-call");
    const inviteLabel = document.getElementById("guest-invite-label");
    if (joinBtn) joinBtn.textContent = typeParam === "voice" ? "Join Voice Call" : "Join Video Call";
    if (inviteLabel) inviteLabel.textContent = typeParam === "voice"
      ? "You are invited to join Guest Voice Room:"
      : "You are invited to join Guest Room:";
  } else {
    showView("dashboard-view");
  }

  // Set presence to online
  setPresence("online");

  // Reset dashboard room call UI if elements exist
  if (dashboardRoomSetup && dashboardRoomLinkPanel) {
    dashboardRoomSetup.classList.remove("hidden");
    dashboardRoomLinkPanel.classList.add("hidden");
    dashboardRoomLinkInput.value = "";
  }

  // Start listeners
  startUsersPresenceListener();
  startIncomingCallsListener();
  startCallHistoryListener();

  // Ask for notification permission
  requestNotificationPermission();
}

function onUserLoggedOut() {
  // Clean up variables & UI
  currentUser = null;
  contacts = [];
  selectedContact = null;
  localCallHistory = [];
  welcomePanel.classList.remove("hidden");
  contactDetailsPanel.classList.add("hidden");

  // Toggle layout class for mobile responsiveness
  document.querySelector(".dashboard-layout")?.classList.remove("contact-selected");

  cleanUpCall();
  stopListeners();

  // Intercept and route to guest panel if invited via room parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  const typeParam = urlParams.get("type") || "video";
  guestCallType = typeParam;

  if (roomParam) {
    showView("guest-view");
    guestSetupPanel.classList.add("hidden");
    guestLinkPanel.classList.add("hidden");
    guestJoinPanel.classList.remove("hidden");
    guestInvitedRoomId.textContent = roomParam.toUpperCase();
    guestRoomId = roomParam;
    isGuestHost = false;
    const joinBtn = document.getElementById("btn-join-guest-call");
    const inviteLabel = document.getElementById("guest-invite-label");
    if (joinBtn) joinBtn.textContent = typeParam === "voice" ? "Join Voice Call" : "Join Video Call";
    if (inviteLabel) inviteLabel.textContent = typeParam === "voice"
      ? "You are invited to join Guest Voice Room:"
      : "You are invited to join Guest Room:";
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
  stopUsersListeners();
  if (incomingCallsListener) {
    incomingCallsListener();
    incomingCallsListener = null;
  }
  if (callHistoryListener) {
    callHistoryListener();
    callHistoryListener = null;
  }
}

function startCallHistoryListener() {
  if (callHistoryListener) {
    callHistoryListener();
    callHistoryListener = null;
  }

  try {
    const q = query(
      collection(db, "calls"),
      or(
        where("callerId", "==", currentUser.uid),
        where("calleeId", "==", currentUser.uid)
      )
    );

    callHistoryListener = onSnapshot(q, (snapshot) => {
      localCallHistory = [];
      snapshot.forEach((doc) => {
        localCallHistory.push({ id: doc.id, ...doc.data() });
      });

      // Refresh selection details call history UI if contact details panel is currently open
      if (selectedContact) {
        renderLocalCallHistory(selectedContact.uid);
      }
    });
  } catch (err) {
    console.error("Error setting up call history listener:", err);
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
          myContactUids.set(doc.id, doc.data());
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
  stopUsersListeners();

  const contactUidArray = Array.from(myContactUids.keys());
  if (contactUidArray.length === 0) {
    contacts = [];
    renderContactsList();
    return;
  }

  // Chunk contacts into groups of 30 due to Firestore "in" filter limitation
  const chunks = [];
  for (let i = 0; i < contactUidArray.length; i += 30) {
    chunks.push(contactUidArray.slice(i, i + 30));
  }

  const tempContactsMap = new Map();

  chunks.forEach((chunk, chunkIdx) => {
    const usersQuery = query(collection(db, "users"), where("uid", "in", chunk));
    const unsub = onSnapshot(usersQuery, (snapshot) => {
      const chunkContacts = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        // Exclude self and blocked UIDs
        if (
          userData.uid !== currentUser.uid &&
          myContactUids.has(userData.uid) &&
          !blockedUids.has(userData.uid)
        ) {
          const contactData = myContactUids.get(userData.uid);
          userData.isTemporary = contactData.isTemporary || false;
          chunkContacts.push(userData);
        }
      });

      tempContactsMap.set(chunkIdx, chunkContacts);

      // Rebuild the unified contacts list
      contacts = [];
      for (const list of tempContactsMap.values()) {
        contacts.push(...list);
      }

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
        } else if (!myContactUids.has(selectedContact.uid)) {
          selectedContact = null;
          welcomePanel.classList.remove("hidden");
          contactDetailsPanel.classList.add("hidden");
        }
      }

      renderContactsList();
    });
    usersListeners.push(unsub);
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
    if (selectedContact && (searchTerm !== "" || !myContactUids.has(selectedContact.uid))) {
      selectedContact = null;
      welcomePanel.classList.remove("hidden");
      contactDetailsPanel.classList.add("hidden");
    }
    return;
  }

  // If selected contact is no longer in filtered list, hide details panel
  if (selectedContact && !filteredContacts.some(c => c.uid === selectedContact.uid)) {
    if (searchTerm !== "" || !myContactUids.has(selectedContact.uid)) {
      selectedContact = null;
      welcomePanel.classList.remove("hidden");
      contactDetailsPanel.classList.add("hidden");
    }
  }

  contactsListContainer.innerHTML = filteredContacts.map(contact => {
    const isOnline = contact.status === "online";
    const statusClass = isOnline ? "online" : "offline";
    const avatarLetter = (contact.displayName || "?").charAt(0).toUpperCase();
    const avatarHTML = contact.photoURL
      ? `<img src="${contact.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : avatarLetter;

    const badgeHTML = contact.isTemporary ? `<span class="contact-temporary-badge">Temporary</span>` : "";

    return `
      <li class="contact-item" data-uid="${contact.uid}" style="border: 1px solid transparent;">
        <div class="contact-item-info">
          <div class="contact-avatar" style="overflow:hidden; flex-shrink:0;">
            ${avatarHTML}
            <div class="contact-status-dot ${statusClass}"></div>
          </div>
          <div class="contact-details">
            <span class="contact-name">${contact.displayName} ${badgeHTML}</span>
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

  const searchValue = addContactInput.value.trim();
  if (!searchValue) return;

  const isEmail = searchValue.includes("@");
  if (isEmail && searchValue.toLowerCase() === currentUser.email.toLowerCase()) {
    addContactFeedback.classList.add("error");
    addContactFeedback.textContent = "You cannot add yourself.";
    return;
  }

  try {
    let targetUser = null;
    let querySnapshot;

    if (isEmail) {
      // Search by email
      const q = query(collection(db, "users"), where("email", "==", searchValue.toLowerCase()));
      querySnapshot = await getDocs(q);
    } else {
      // Search by phone number
      const q = query(collection(db, "users"), where("phone", "==", searchValue));
      querySnapshot = await getDocs(q);
    }

    if (querySnapshot.empty) {
      addContactFeedback.classList.add("error");
      addContactFeedback.textContent = isEmail ? "No user found with this email." : "No user found with this phone number.";
      return;
    }

    querySnapshot.forEach((doc) => {
      targetUser = doc.data();
    });

    if (targetUser.uid === currentUser.uid) {
      addContactFeedback.classList.add("error");
      addContactFeedback.textContent = "You cannot add yourself.";
      return;
    }

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
    addContactInput.value = "";

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
async function initiateOutgoingCall(targetContact, callType = "video") {
  // Update status to busy
  setPresence("busy");
  activeCallType = callType;

  // Show Outgoing UI Overlay
  outgoingCallCard.querySelector(".call-title").textContent = callType === "voice" ? "Voice Calling" : "Video Calling";
  outgoingCalleeName.textContent = targetContact.displayName;
  outgoingCalleeEmail.textContent = targetContact.email;

  // Set avatar: photo or initial letter
  setCallAvatar("outgoing", targetContact.displayName, targetContact.photoURL || null);

  outgoingCallCard.classList.remove("hidden");
  incomingCallCard.classList.add("hidden");
  callOverlay.classList.add("active");

  // Play dialing ringing audio sound
  audioRinging.play().catch(e => console.log("Sound autoplay blocked:", e));

  try {
    await startCall(currentUser, targetContact, callType);
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
        currentIncomingCallData = callData;
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

  // Show avatar: photo if caller has one, otherwise initial letter
  setCallAvatar("incoming", callData.callerName, callData.callerPhotoURL || null);

  // Show call type in incoming card title
  const incomingType = callData.callType || "video";
  incomingCallCard.querySelector(".call-title").textContent =
    incomingType === "voice" ? "Incoming Voice Call" : "Incoming Video Call";

  incomingCallCard.classList.remove("hidden");
  outgoingCallCard.classList.add("hidden");
  callOverlay.classList.add("active");

  // Play ringtone audio sound
  audioRinging.play().catch(e => console.log("Sound autoplay blocked:", e));

  // Show native system notification
  const callTypeLabel = incomingType === "voice" ? "Voice Call" : "Video Call";
  showLocalNotification(
    `Incoming ${callTypeLabel}`,
    `${callData.callerName} is calling you on NexCall...`
  );
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

  if (activeNotification) {
    activeNotification.close();
    activeNotification = null;
  }

  audioRinging.pause();
  audioRinging.currentTime = 0;

  callOverlay.classList.remove("active");
  showView("call-room-view");
  callPartnerName.textContent = incomingCallerName.textContent;

  try {
    const result = await acceptCall(currentIncomingCallId, currentUser.uid);
    localVideo.srcObject = result.localStream;
    remoteVideo.srcObject = result.remoteStream;

    // Pass caller's photo to voice room avatar (read from call data stored earlier)
    const callerPhotoURL = result.callerPhotoURL || null;
    configureCallRoomUI(result.callType, incomingCallerName.textContent, callerPhotoURL);
    startCallTimer();

    // Auto-save unknown caller as temporary contact
    if (currentIncomingCallData && !myContactUids.has(currentIncomingCallData.callerId)) {
      try {
        const contactRef = doc(db, "users", currentUser.uid, "contacts", currentIncomingCallData.callerId);
        await setDoc(contactRef, {
          uid: currentIncomingCallData.callerId,
          email: currentIncomingCallData.callerEmail,
          displayName: currentIncomingCallData.callerName,
          photoURL: currentIncomingCallData.callerPhotoURL || null,
          addedAt: serverTimestamp(),
          isTemporary: true
        });
      } catch (err) {
        console.error("Failed to auto-save temporary contact:", err);
      }
    }
  } catch (err) {
    alert("Failed to establish peer-to-peer connection: " + err.message);
    hangUpCall().then(() => {
      endActiveCallUI();
    });
  }
});

// --- CALL STATE ENGINE CALLBACKS FROM WEBRTC.JS ---

/**
 * Configures the call room UI for voice-only or video calls.
 * Shows/hides the video elements and voice avatar accordingly.
 */
function configureCallRoomUI(callType, partnerName, partnerPhotoURL) {
  const voiceContainer = document.getElementById("voice-call-avatar-container");
  const voiceNameEl = document.getElementById("voice-call-partner-name");

  if (voiceNameEl) voiceNameEl.textContent = partnerName || "Partner";

  if (callType === "voice") {
    // Show voice avatar with photo or initial letter
    setCallAvatar("voice", partnerName, partnerPhotoURL || null);
    // Hide camera UI, show voice avatar
    if (localVideoContainer) localVideoContainer.classList.add("hidden");
    remoteVideo.classList.add("hidden");
    if (voiceContainer) voiceContainer.classList.remove("hidden");
    btnToggleVideo.style.display = "none";
  } else {
    // Show camera UI, hide voice avatar
    if (localVideoContainer) localVideoContainer.classList.remove("hidden");
    remoteVideo.classList.remove("hidden");
    if (voiceContainer) voiceContainer.classList.add("hidden");
    btnToggleVideo.style.display = "";
  }
}

registerCallbacks({
  onCallAccepted: () => {
    // Triggered on the caller's side when the callee answers the call
    audioRinging.pause();
    audioRinging.currentTime = 0;

    callOverlay.classList.remove("active");
    showView("call-room-view");
    callPartnerName.textContent = outgoingCalleeName.textContent;

    configureCallRoomUI(activeCallType, outgoingCalleeName.textContent, selectedContact?.photoURL || null);
    startCallTimer();
  },

  onCallEnded: (reason) => {
    endActiveCallUI();
    if (reason === "declined") {
      alert("The contact declined your call.");
    }
  },

  onRemoteStream: (stream) => {
    remoteVideo.srcObject = stream;
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

  if (activeNotification) {
    activeNotification.close();
    activeNotification = null;
  }

  callOverlay.classList.remove("active");
  showView("dashboard-view");

  // Toggle layout class for mobile responsiveness
  document.querySelector(".dashboard-layout")?.classList.remove("contact-selected");

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
  btnToggleVideo.style.display = "";

  // Reset voice call UI state
  const voiceContainer = document.getElementById("voice-call-avatar-container");
  if (voiceContainer) voiceContainer.classList.add("hidden");
  const localVideoContainer = document.getElementById("local-video-container");
  if (localVideoContainer) localVideoContainer.classList.remove("hidden");
  remoteVideo.classList.remove("hidden");

  if (isScreenSharing) {
    stopScreenSharingTrack();
  }

  // Clear chat panel
  chatMessagesContainer.innerHTML = `
    <div class="e2ee-chat-notice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even NexCall, can read or listen to them. Click to learn more.</span>
    </div>
  `;
  chatNotificationBadge.classList.add("hidden");
  unreadChatCount = 0;
  isChatOpen = false;
  callChatSidebar.classList.add("hidden");

  outgoingCalleeEmail.textContent = "";
  incomingCallerEmail.textContent = "";
  currentIncomingCallId = null;
  currentIncomingCallData = null;
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
  const stream = isGuestCall ? getLocalGuestStream() : getLocalStream();
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
    if (localVideoContainer) localVideoContainer.classList.add("chat-open");
  } else {
    callChatSidebar.classList.add("hidden");
    btnToggleChat.classList.remove("active");
    if (localVideoContainer) localVideoContainer.classList.remove("chat-open");
  }
});

btnCloseChat.addEventListener("click", () => {
  isChatOpen = false;
  callChatSidebar.classList.add("hidden");
  btnToggleChat.classList.remove("active");
  if (localVideoContainer) localVideoContainer.classList.remove("chat-open");
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
      const senderName = currentUser.displayName || currentUser.email.split("@")[0];
      sendChatMessage(currentUser.uid, text, senderName);
      renderChatMessage({ senderUid: currentUser.uid, text: text, senderName: senderName });
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
  renderContactDetailAvatar(contact);

  const isOnline = contact.status === "online";
  detailStatus.textContent = contact.status;
  detailStatus.className = `contact-status-text ${isOnline ? 'online' : 'offline'}`;
  detailStatus.style.color = isOnline ? "var(--success)" : "var(--text-muted)";

  // Show details panel
  welcomePanel.classList.add("hidden");
  contactDetailsPanel.classList.remove("hidden");

  if (contact.isTemporary) {
    btnDetailKeep.classList.remove("hidden");
  } else {
    btnDetailKeep.classList.add("hidden");
  }
  
  // Toggle layout class for mobile responsiveness
  document.querySelector(".dashboard-layout")?.classList.add("contact-selected");

  // Load call history specific to this contact
  loadContactCallHistory(contact.uid);
}

btnDetailVoiceCall.addEventListener("click", () => {
  if (selectedContact) {
    initiateOutgoingCall(selectedContact, "voice");
  }
});

btnDetailVideoCall.addEventListener("click", () => {
  if (selectedContact) {
    initiateOutgoingCall(selectedContact, "video");
  }
});

btnDetailBlock.addEventListener("click", () => {
  if (selectedContact) {
    blockUser(selectedContact);
  }
});

btnDetailKeep.addEventListener("click", async () => {
  if (selectedContact && selectedContact.isTemporary) {
    try {
      const contactRef = doc(db, "users", currentUser.uid, "contacts", selectedContact.uid);
      await updateDoc(contactRef, { isTemporary: false });
      selectedContact.isTemporary = false;
      btnDetailKeep.classList.add("hidden");
    } catch (err) {
      console.error("Error keeping contact:", err);
    }
  }
});

btnDetailRemove.addEventListener("click", async () => {
  if (selectedContact) {
    if (!confirm(`Are you sure you want to remove ${selectedContact.displayName} from your contacts?`)) return;
    try {
      const contactRef = doc(db, "users", currentUser.uid, "contacts", selectedContact.uid);
      await deleteDoc(contactRef);
      // Deselect contact visually
      selectedContact = null;
      welcomePanel.classList.remove("hidden");
      contactDetailsPanel.classList.add("hidden");
      document.querySelector(".dashboard-layout")?.classList.remove("contact-selected");
    } catch (err) {
      console.error("Error removing contact:", err);
    }
  }
});

btnCloseContactDetails.addEventListener("click", () => {
  selectedContact = null;
  welcomePanel.classList.remove("hidden");
  contactDetailsPanel.classList.add("hidden");

  // Toggle layout class for mobile responsiveness
  document.querySelector(".dashboard-layout")?.classList.remove("contact-selected");

  // Clear active selection highlighting in sidebar contacts list
  contactsListContainer.querySelectorAll(".contact-item").forEach(item => {
    item.style.background = "transparent";
    item.style.borderColor = "transparent";
  });
});

// ==========================================================================
// 8. SETTINGS MODAL INTERACTION
// ==========================================================================
btnSettings.addEventListener("click", async () => {
  settingsDisplayName.value = currentUser.displayName || "";
  settingsFeedback.textContent = "";
  deleteFeedback.textContent = "";
  settingsModal.classList.add("active");
  switchSettingsTab("profile");

  // Load current photo and phone into settings
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const userData = snap.data();
      if (userData.photoURL) {
        renderUserAvatar(userData.photoURL);
      }
      if (settingsPhoneInput) {
        settingsPhoneInput.value = userData.phone || "";
      }
    }
  } catch (e) { /* silent */ }
});

// Avatar upload: clicking avatar div triggers hidden file input
if (settingsAvatarContainer) {
  settingsAvatarContainer.addEventListener("click", () => {
    if (avatarFileInput) avatarFileInput.click();
  });
}

// When user selects a file, upload to Cloudinary and save URL
if (avatarFileInput) {
  avatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate: image only, max 5 MB
    if (!file.type.startsWith("image/")) {
      if (avatarUploadStatus) { avatarUploadStatus.style.color = "var(--danger)"; avatarUploadStatus.textContent = "Please select an image file."; }
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      if (avatarUploadStatus) { avatarUploadStatus.style.color = "var(--danger)"; avatarUploadStatus.textContent = "Image must be smaller than 5 MB."; }
      return;
    }

    if (avatarUploadStatus) { avatarUploadStatus.style.color = "var(--primary)"; avatarUploadStatus.textContent = "Uploading...⏳"; }

    // Show local preview immediately for snappy feel
    const reader = new FileReader();
    reader.onload = (evt) => {
      const settingsImg = document.getElementById("settings-avatar-img");
      const settingsLetter = document.getElementById("settings-avatar-letter");
      if (settingsImg) { settingsImg.src = evt.target.result; settingsImg.style.display = "block"; }
      if (settingsLetter) settingsLetter.style.display = "none";
    };
    reader.readAsDataURL(file);

    try {
      const photoURL = await uploadToCloudinary(file);

      // Save to Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { photoURL });

      // Update Firebase Auth profile
      await updateProfile(currentUser, { photoURL });

      // Update all avatar UI elements
      renderUserAvatar(photoURL);

      if (avatarUploadStatus) { avatarUploadStatus.style.color = "var(--success)"; avatarUploadStatus.textContent = "✓ Photo updated successfully!"; }
      setTimeout(() => { if (avatarUploadStatus) avatarUploadStatus.textContent = ""; }, 3000);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      if (avatarUploadStatus) { avatarUploadStatus.style.color = "var(--danger)"; avatarUploadStatus.textContent = "Upload failed: " + err.message; }
    }

    // Reset file input so same file can be re-selected
    avatarFileInput.value = "";
  });
}

btnCloseSettings.addEventListener("click", () => {
  settingsModal.classList.remove("active");
});

// Attach event listeners for Settings tabs (JS side to avoid inline issues)
settingsTabProfile.addEventListener("click", () => switchSettingsTab("profile"));
settingsTabBlocked.addEventListener("click", () => switchSettingsTab("blocked"));

window.switchSettingsTab = function (tab) {
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
  const newPhone = settingsPhoneInput ? settingsPhoneInput.value.trim() : "";
  if (!newName) return;

  try {
    await updateProfile(currentUser, { displayName: newName });
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { 
      displayName: newName,
      phone: newPhone
    });

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
    await deleteUser(currentUser);

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

function renderLocalCallHistory(contactUid) {
  try {
    // Filter calls strictly between currentUser and selected contactUid
    const filteredCalls = localCallHistory.filter(call =>
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

async function loadContactCallHistory(contactUid) {
  renderLocalCallHistory(contactUid);
}

// ==========================================================================
// 10. GUEST CALL SESSION CONTROLLERS (SUPABASE REALTIME)
// ==========================================================================

async function initiateGuestCallSession() {
  isGuestCall = true;
  showView("call-room-view");
  callPartnerName.textContent = "Connecting...";

  const partnerName = isGuestHost ? "Guest Partner" : "Host Partner";
  // Pre-configure the room UI based on the expected call type
  configureCallRoomUI(guestCallType, partnerName);

  try {
    await startGuestCall(guestRoomId, isGuestHost, localVideo, remoteVideo, {
      onCallAccepted: (negotiatedCallType) => {
        startCallTimer();
        callPartnerName.textContent = partnerName;
        // Re-configure once negotiation confirms type (guest side may receive host's type)
        if (negotiatedCallType) configureCallRoomUI(negotiatedCallType, partnerName);
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
    }, guestCallType);
  } catch (err) {
    alert("Could not establish Supabase peer call: " + err.message);
    endActiveGuestCallUI();
  }
}

function endActiveGuestCallUI() {
  isGuestCall = false;

  // Toggle layout class for mobile responsiveness
  document.querySelector(".dashboard-layout")?.classList.remove("contact-selected");

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
  btnToggleVideo.style.display = "";

  // Reset voice call UI
  const voiceContainer = document.getElementById("voice-call-avatar-container");
  if (voiceContainer) voiceContainer.classList.add("hidden");
  const localVideoContainer = document.getElementById("local-video-container");
  if (localVideoContainer) localVideoContainer.classList.remove("hidden");
  remoteVideo.classList.remove("hidden");

  if (isScreenSharing) {
    stopScreenSharingTrack();
  }

  // Reset chat sidebar
  chatMessagesContainer.innerHTML = `
    <div class="e2ee-chat-notice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even NexCall, can read or listen to them. Click to learn more.</span>
    </div>
  `;
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
    
    // Reset dashboard room call UI if elements exist
    if (dashboardRoomSetup && dashboardRoomLinkPanel) {
      dashboardRoomSetup.classList.remove("hidden");
      dashboardRoomLinkPanel.classList.add("hidden");
      dashboardRoomLinkInput.value = "";
    }
    
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

btnCreateGuestVoice.addEventListener("click", () => {
  guestRoomId = Math.random().toString(36).substring(2, 8);
  guestCallType = "voice";
  const url = window.location.origin + window.location.pathname + "?room=" + guestRoomId + "&type=voice";

  guestRoomLinkInput.value = url;

  guestSetupPanel.classList.add("hidden");
  guestLinkPanel.classList.remove("hidden");
  isGuestHost = true;
});

btnCreateGuestVideo.addEventListener("click", () => {
  guestRoomId = Math.random().toString(36).substring(2, 8);
  guestCallType = "video";
  const url = window.location.origin + window.location.pathname + "?room=" + guestRoomId + "&type=video";

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

// Dashboard Room Call Event Listeners
btnCreateDashboardRoomVoice.addEventListener("click", () => {
  guestRoomId = Math.random().toString(36).substring(2, 8);
  guestCallType = "voice";
  const url = window.location.origin + window.location.pathname + "?room=" + guestRoomId + "&type=voice";

  dashboardRoomLinkInput.value = url;

  dashboardRoomSetup.classList.add("hidden");
  dashboardRoomLinkPanel.classList.remove("hidden");
  isGuestHost = true;
});

btnCreateDashboardRoomVideo.addEventListener("click", () => {
  guestRoomId = Math.random().toString(36).substring(2, 8);
  guestCallType = "video";
  const url = window.location.origin + window.location.pathname + "?room=" + guestRoomId + "&type=video";

  dashboardRoomLinkInput.value = url;

  dashboardRoomSetup.classList.add("hidden");
  dashboardRoomLinkPanel.classList.remove("hidden");
  isGuestHost = true;
});

btnCopyDashboardRoomLink.addEventListener("click", () => {
  navigator.clipboard.writeText(dashboardRoomLinkInput.value).then(() => {
    btnCopyDashboardRoomLink.textContent = "Copied!";
    setTimeout(() => {
      btnCopyDashboardRoomLink.textContent = "Copy";
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
});

btnStartDashboardRoomCall.addEventListener("click", () => {
  initiateGuestCallSession();
});

btnCancelDashboardRoom.addEventListener("click", () => {
  guestRoomId = null;
  isGuestHost = false;
  dashboardRoomLinkPanel.classList.add("hidden");
  dashboardRoomSetup.classList.remove("hidden");
});

