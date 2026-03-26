importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBpDJC5H2Zvf_Dc_9fLptlPFTJymHlG4Rw",
  authDomain: "gen-lang-client-0217226385.firebaseapp.com",
  projectId: "gen-lang-client-0217226385",
  storageBucket: "gen-lang-client-0217226385.firebasestorage.app",
  messagingSenderId: "182179514214",
  appId: "1:182179514214:web:a7d25b7bf424aaa2fdeaa7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
