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
  onAuthStateChanged 
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

enableIndexedDbPersistence(db).catch(err => console.log("Persistencia:", err.code));

const tasksRef = collection(db, "tareas");

const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('authError');
const userDisplay = document.getElementById('userDisplay');

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

let currentUser = null;
let unsubscribeListener = null;


loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Por favor ingresa correo y contraseña.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error al ingresar:", error);
    authError.textContent = "Error al ingresar: Verifique su correo o contraseña.";
  }
});

registerBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  authError.textContent = '';

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Por favor ingresa un correo y contraseña.";
    return;
  }

  if (password.length < 6) {
    authError.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error al registrar:", error);
    if (error.code === 'auth/email-already-in-use') {
      authError.textContent = "Este correo ya está registrado. Intenta iniciar sesión.";
    } else {
      authError.textContent = "Error al registrar: " + error.message;
    }
  }
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (userDisplay) userDisplay.textContent = user.email;
    
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    authEmail.value = '';
    authPassword.value = '';
    
    listenToUserTasks(user.uid);
  } else {
    currentUser = null;
    if (unsubscribeListener) unsubscribeListener();
    
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    taskList.innerHTML = '';
  }
});


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
    console.error("Error al guardar:", error);
  }
}

function listenToUserTasks(uid) {
  if (unsubscribeListener) unsubscribeListener();

  const q = query(
    tasksRef, 
    where("userId", "==", uid)
  );

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
    console.error("Error en Snapshot:", error);
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}