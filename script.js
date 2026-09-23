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
  updateProfile,
  setPersistence,
  browserLocalPersistence
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

// Habilitar la persistencia del token de sesión en la memoria local
setPersistence(auth, browserLocalPersistence).catch(err => console.log("Error Persistencia Auth:", err));

// Habilitar la base de datos offline (cola de tareas por sincronizar)
enableIndexedDbPersistence(db).catch(err => console.log("Error Persistencia Firestore:", err.code));

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

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  if (!navigator.onLine) {
    loginError.textContent = "Sin conexión. Necesitas internet la primera vez para validar tus credenciales.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value.trim());
  } catch (error) {
    console.error("Error Login:", error);
    loginError.textContent = "Correo o contraseña incorrectos.";
  }
});

// Registro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';

  if (!navigator.onLine) {
    registerError.textContent = "Sin conexión. Necesitas internet para registrarte.";
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

// Cerrar sesión
logoutBtn.addEventListener('click', () => signOut(auth));

// Detectar Token de Sesión (Online u Offline)
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;

    const nameToShow = user.displayName || user.email.split('@')[0];
    
    if (userDisplay && !userDisplay.textContent) {
      userDisplay.textContent = nameToShow;
    } else if (userDisplay && user.displayName) {
      userDisplay.textContent = user.displayName;
    }

    loginCard.style.display = 'none';
    registerCard.style.display = 'none';
    appContainer.style.display = 'block';

    loginEmail.value = '';
    loginPassword.value = '';
    regName.value = '';
    regEmail.value = '';
    regPassword.value = '';

    // Escuchar tareas (funciona offline desde IndexedDB)
    listenToUserTasks(user.uid);
  } else {
    currentUser = null;
    if (unsubscribeListener) unsubscribeListener();

    if (userDisplay) userDisplay.textContent = '';
    loginCard.style.display = 'block';
    registerCard.style.display = 'none';
    appContainer.style.display = 'none';
    taskList.innerHTML = '';
  }
});

// --- MANEJO DE TAREAS (ONLINE Y OFFLINE) ---

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

async function addTask() {
  const text = taskInput.value.trim();
  if (text === '' || !currentUser) return;

  try {
    // addDoc guarda la tarea localmente si estás offline y la sube cuando vuelve la red
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
    console.error("Error Snapshot:", error);
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

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}