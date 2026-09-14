const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

document.addEventListener('DOMContentLoaded', loadTasks);
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

function addTask() {
  const text = taskInput.value.trim();
  if (text === '') return;

  createTaskElement(text);
  saveTaskToLocalStorage(text);
  taskInput.value = '';
}

function createTaskElement(text) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.classList.add('delete-btn');
  
  deleteBtn.addEventListener('click', () => {
    li.remove();
    removeTaskFromLocalStorage(text);
  });

  li.appendChild(span);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

function saveTaskToLocalStorage(taskText) {
  let tasks = getTasksFromLocalStorage();
  tasks.push(taskText);
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function getTasksFromLocalStorage() {
  const tasks = localStorage.getItem('tasks');
  return tasks ? JSON.parse(tasks) : [];
}

function loadTasks() {
  const tasks = getTasksFromLocalStorage();
  tasks.forEach(task => createTaskElement(task));
}

function removeTaskFromLocalStorage(taskText) {
  let tasks = getTasksFromLocalStorage();
  tasks = tasks.filter(task => task !== taskText);
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

    if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registrado'))
      .catch(err => console.error('Error al registrar SW:', err));
  });
}