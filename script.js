import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
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

enableIndexedDbPersistence(db).catch((err) => {
  console.log("Persistencia offline no disponible:", err.code);
});

const tasksRef = collection(db, "tareas");
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

async function addTask() {
  const text = taskInput.value.trim();
  if (text === '') return;

  try {
    await addDoc(tasksRef, {
      text: text,
      createdAt: Date.now()
    });
    taskInput.value = '';
  } catch (error) {
    console.error("Error al agregar:", error);
  }
}

const q = query(tasksRef, orderBy("createdAt", "asc"));

onSnapshot(q, (snapshot) => {
  taskList.innerHTML = ''; 

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const id = docSnapshot.id;
    createTaskElement(data.text, id);
  });
});

function createTaskElement(text, id) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.classList.add('delete-btn');
  
  deleteBtn.addEventListener('click', async () => {
    try {
      await deleteDoc(doc(db, "tareas", id));
    } catch (error) {
      console.error("Error al borrar:", error);
    }
  });

  li.appendChild(span);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.error('Error al registrar SW:', err));
  });
}