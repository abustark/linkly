// Firebase v10 (modular ESM) with a thin v8-style facade so page code stays simple.
// Loaded as <script type="module"> — exposes window.LinklyFirebase synchronously on evaluation.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signInWithCredential,
    signOut,
    GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDRuTdgt9l5KEcGNEdXadm0FXRUndPsWAE",
    authDomain: "linkly-project-43464.firebaseapp.com",
    projectId: "linkly-project-43464",
    storageBucket: "linkly-project-43464.firebasestorage.app",
    messagingSenderId: "289406240228",
    appId: "1:289406240228:web:4b7e82d2a51089e8fbf3f1"
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

const authFacade = {
    get currentUser() { return auth.currentUser; },
    onAuthStateChanged: (callback, errorCb, completed) => onAuthStateChanged(auth, callback, errorCb, completed),
    signOut: () => signOut(auth),
    signInWithCredential: (credential) => signInWithCredential(auth, credential)
};

window.LinklyFirebase = {
    config: FIREBASE_CONFIG,
    auth: authFacade,
    GoogleAuthProvider
};
