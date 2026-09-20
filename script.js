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
  orderBy,
  enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

enableIndexedDbPersistence(db).catch(err => console.log("Persistencia:", err.code));

const tasksRef = collection(db, "tareas");

// DOM
const userSelectContainer = document.getElementById('userSelectContainer');
const appContainer = document.getElementById('appContainer');
const usernameInput = document.getElementById('usernameInput');
const enterUserBtn = document.getElementById('enterUserBtn');
const currentUserLabel = document.getElementById('currentUserLabel');
const changeUserBtn = document.getElementById('changeUserBtn');

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

let currentUser = localStorage.getItem('active_user') || null;
let unsubscribeListener = null;

// Inicializar estado según si ya había un usuario guardado
if (currentUser) {
  loadUserSession(currentUser);
}

// Entrar con nombre de usuario
enterUserBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim().toLowerCase();
  if (name === '') return;
  loadUserSession(name);
});

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') enterUserBtn.click();
});

// Cambiar de usuario
changeUserBtn.addEventListener('click', () => {
  localStorage.removeItem('active_user');
  currentUser = null;
  if (unsubscribeListener) unsubscribeListener();
  
  appContainer.style.display = 'none';
  userSelectContainer.style.display = 'block';
  usernameInput.value = '';
  taskList.innerHTML = '';
});

function loadUserSession(username) {
  currentUser = username;
  localStorage.setItem('active_user', username);
  currentUserLabel.textContent = username;

  userSelectContainer.style.display = 'none';
  appContainer.style.display = 'block';

  listenToUserTasks(username);
}

// Agregar tarea vinculada al nombre de usuario
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

async function addTask() {
  const text = taskInput.value.trim();
  if (text === '' || !currentUser) return;

  try {
    await addDoc(tasksRef, {
      text: text,
      user: currentUser, // Se asigna al usuario actual
      createdAt: Date.now()
    });
    taskInput.value = '';
  } catch (error) {
    console.error("Error al guardar:", error);
  }
}

// Escuchar solo las tareas del usuario activo
function listenToUserTasks(username) {
  if (unsubscribeListener) unsubscribeListener();

  const q = query(
    tasksRef, 
    where("user", "==", username), 
    orderBy("createdAt", "asc")
  );

  unsubscribeListener = onSnapshot(q, (snapshot) => {
    taskList.innerHTML = '';
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      createTaskElement(data.text, docSnapshot.id);
    });
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