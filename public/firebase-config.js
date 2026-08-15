(function () {
    "use strict";

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyDRuTdgt9l5KEcGNEdXadm0FXRUndPsWAE",
        authDomain: "linkly-project-43464.firebaseapp.com",
        projectId: "linkly-project-43464",
        storageBucket: "linkly-project-43464.firebasestorage.app",
        messagingSenderId: "289406240228",
        appId: "1:289406240228:web:4b7e82d2a51089e8fbf3f1",
        measurementId: "G-CPNES7BTDN"
    };

    window.LinklyFirebase = {
        config: FIREBASE_CONFIG,
        init: function () {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            return firebase;
        }
    };
})();
