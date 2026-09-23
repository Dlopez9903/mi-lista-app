import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDu1bXfecLVkvVhfLmCCOgBZr67_z5JwLw",
  authDomain: "mi-lista-sincronizada.firebaseapp.com",
  projectId: "mi-lista-sincronizada",
  storageBucket: "mi-lista-sincronizada.firebasestorage.app",
  messagingSenderId: "969847361448",
  appId: "1:969847361448:web:a2be272388a20c61fa579d",
  measurementId: "G-KGSFQNTFX2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch(err => console.log("Persistencia Firestore:", err.code));

const tasksRef = collection(db, "tareas");

// DOM
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const appContainer = document.getElementById('appContainer');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const registerError = document.getElementById('registerError');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplay = document.getElementById('userDisplay');

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

let currentUser = null;
let unsubscribeListener = null;

// Modos de navegación
showRegisterBtn.addEventListener('click', () => {
  loginCard.style.display = 'none';
  registerCard.style.display = 'block';
  loginError.textContent = '';
});

showLoginBtn.addEventListener('click', () => {
  registerCard.style.display = 'none';
  loginCard.style.display = 'block';
  registerError.textContent = '';
});

// --- HELPER DE CACHÉ LOCAL ---
function saveLocalUser(email, password, uid, displayName) {
  const users = JSON.parse(localStorage.getItem('pwa_cached_users') || '{}');
  users[email.toLowerCase()] = {
    password: password,
    uid: uid,
    displayName: displayName || email.split('@')[0]
  };
  localStorage.setItem('pwa_cached_users', JSON.stringify(users));
}

function getLocalUser(email, password) {
  const users = JSON.parse(localStorage.getItem('pwa_cached_users') || '{}');
  const user = users[email.toLowerCase()];
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// --- INICIO DE SESIÓN (ONLINE / OFFLINE) ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  // INTENTO EN LÍNEA CON FIREBASE
  if (navigator.onLine) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Guardar en caché para futuros logins offline
      saveLocalUser(email, password, userCredential.user.uid, userCredential.user.displayName);
    } catch (error) {
      console.error("Error Login Firebase:", error);
      loginError.textContent = "Correo o contraseña incorrectos.";
    }
  } else {
    // INTENTO OFFLINE DESDE CACHÉ LOCAL
    const cachedUser = getLocalUser(email, password);
    if (cachedUser) {
      loginOfflineSession(cachedUser);
    } else {
      loginError.textContent = "Sin conexión. No se encontraron credenciales guardadas en este dispositivo para este usuario.";
    }
  }
});

// Registrar nuevo usuario
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';

  if (!navigator.onLine) {
    registerError.textContent = "Para registrar una cuenta nueva por primera vez necesitas conexión a internet.";
    return;
  }

  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value.trim();

  if (!name) {
    registerError.textContent = "Por favor ingresa tu nombre completo.";
    return;
  }

  if (password.length < 6) {
    registerError.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    // Guardar en caché local
    saveLocalUser(email, password, userCredential.user.uid, name);

    if (userDisplay) userDisplay.textContent = name;

  } catch (error) {
    console.error("Error Registro:", error);
    if (error.code === 'auth/email-already-in-use') {
      registerError.textContent = "Este correo ya está registrado. Intenta iniciar sesión.";
    } else {
      registerError.textContent = "Error al registrar: " + error.message;
    }
  }
});

// Iniciar interfaz en modo Offline simulado
function loginOfflineSession(user) {
  currentUser = user;
  localStorage.setItem('pwa_offline_active_uid', user.uid);
  localStorage.setItem('pwa_offline_active_name', user.displayName);

  if (userDisplay) userDisplay.textContent = user.displayName;

  loginCard.style.display = 'none';
  registerCard.style.display = 'none';
  appContainer.style.display = 'block';

  loginEmail.value = '';
  loginPassword.value = '';

  listenToUserTasks(user.uid);
}

// Cerrar sesión
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('pwa_offline_active_uid');
  localStorage.removeItem('pwa_offline_active_name');
  if (navigator.onLine) {
    signOut(auth);
  } else {
    currentUser = null;
    if (unsubscribeListener) unsubscribeListener();
    loginCard.style.display = 'block';
    appContainer.style.display = 'none';
    taskList.innerHTML = '';
  }
});

// Escuchador Firebase Online + Respaldo Offline
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const nameToShow = user.displayName || user.email.split('@')[0];

    // Actualizar credenciales en caché
    saveLocalUser(user.email, loginPassword.value || '', user.uid, nameToShow);

    if (userDisplay) userDisplay.textContent = nameToShow;

    loginCard.style.display = 'none';
    registerCard.style.display = 'none';
    appContainer.style.display = 'block';

    loginEmail.value = '';
    loginPassword.value = '';

    listenToUserTasks(user.uid);
  } else {
    // Si no hay sesión activa de Firebase, revisar si hay sesión local offline activa
    const offlineUid = localStorage.getItem('pwa_offline_active_uid');
    const offlineName = localStorage.getItem('pwa_offline_active_name');

    if (!navigator.onLine && offlineUid) {
      loginOfflineSession({ uid: offlineUid, displayName: offlineName });
    } else {
      currentUser = null;
      if (unsubscribeListener) unsubscribeListener();

      if (userDisplay) userDisplay.textContent = '';
      loginCard.style.display = 'block';
      registerCard.style.display = 'none';
      appContainer.style.display = 'none';
      taskList.innerHTML = '';
    }
  }
});

// --- TAREAS ---

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

async function addTask() {
  const text = taskInput.value.trim();
  if (text === '' || !currentUser) return;

  try {
    await addDoc(tasksRef, {
      text: text,
      userId: currentUser.uid,
      createdAt: Date.now()
    });
    taskInput.value = '';
  } catch (error) {
    console.error("Error al guardar tarea:", error);
  }
}

function listenToUserTasks(uid) {
  if (unsubscribeListener) unsubscribeListener();

  const q = query(tasksRef, where("userId", "==", uid));

  unsubscribeListener = onSnapshot(q, (snapshot) => {
    taskList.innerHTML = '';
    
    const docs = [];
    snapshot.forEach((docSnapshot) => {
      docs.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });

    docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    docs.forEach((item) => {
      createTaskElement(item.text, item.id);
    });
  }, (error) => {
    console.error("Error Snapshot Firestore:", error);
  });
}

function createTaskElement(text, id) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.classList.add('delete-btn');
  deleteBtn.addEventListener('click', async () => {
    await deleteDoc(doc(db, "tareas", id));
  });

  li.appendChild(span);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

// SW PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}