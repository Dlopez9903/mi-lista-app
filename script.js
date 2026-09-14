import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot 
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
const actionsRef = collection(db, "acciones");

let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', deviceId);
}

let myTasks = JSON.parse(localStorage.getItem('my_local_tasks')) || [];

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

renderList();

// Eventos de entrada
addBtn.addEventListener('click', () => addTask(taskInput.value.trim()));
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask(taskInput.value.trim());
});

function addTask(text) {
  if (text === '') return;
  myTasks.push(text);
  saveAndRender();
  taskInput.value = '';
}

function saveAndRender() {
  localStorage.setItem('my_local_tasks', JSON.stringify(myTasks));
  renderList();
}

function renderList() {
  taskList.innerHTML = '';
  myTasks.forEach((text, index) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.classList.add('delete-btn');

    deleteBtn.addEventListener('click', async () => {
      deleteTaskLocal(index);
      
      await addDoc(actionsRef, {
        action: 'DELETE',
        index: index,
        sender: deviceId,
        timestamp: Date.now()
      });
    });

    li.appendChild(span);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function deleteTaskLocal(index) {
  if (index >= 0 && index < myTasks.length) {
    myTasks.splice(index, 1);
    saveAndRender();
  }
}

// Escuchar comandos de sincronización desde el otro dispositivo
onSnapshot(actionsRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const data = change.doc.data();
      if (data.sender !== deviceId && data.action === 'DELETE') {
        deleteTaskLocal(data.index);
      }
    }
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}