
// Firebase configuration - REPLACE WITH YOUR OWN CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAk7EOUaBhAbPsF3t5oBItWprze6IZH_OY",
    authDomain: "to-do-707f2.firebaseapp.com",
    projectId: "to-do-707f2",
    storageBucket: "to-do-707f2.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');
const themeText = themeToggle.querySelector('span');
const taskList = document.getElementById('taskList');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const priorityOptions = document.querySelectorAll('.priority-option');
const notification = document.getElementById('notification');
const authBtn = document.getElementById('authBtn');
const authContainer = document.getElementById('authContainer');
const appContent = document.getElementById('appContent');
const head = document.getElementById('head');
// Stats elements
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const highPriorityEl = document.getElementById('highPriority');

// Task data
let tasks = [];
let unsubscribeTasks = null;

// Theme toggle functionality
function toggleTheme() {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');

    if (!isDarkMode) {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = 'Dark Mode';
    }

    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (savedTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    }
}

// Initialize app
initTheme();

// Event listeners
themeToggle.addEventListener('click', toggleTheme);

// Priority selection
priorityOptions.forEach(option => {
    option.addEventListener('click', () => {
        priorityOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    });
});

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        setupAuthUI(user);
        initTasks(user.uid);
    } else {
        // User is signed out
        setupAuthUI(null);
        if (unsubscribeTasks) unsubscribeTasks();
        tasks = [];
        renderTasks();
    }
});

// Auth button click
authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
        // Sign out
        auth.signOut().then(() => {
            showNotification('Signed out successfully', 'success');
        }).catch(error => {
            showNotification(error.message, 'error');
        });
    } else {
        // Sign in with Google
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then(() => {
            showNotification('Signed in successfully', 'success');
        }).catch(error => {
            showNotification(error.message, 'error');
        });
    }
});

// Setup auth UI
function setupAuthUI(user) {
    if (user) {
        // User is signed in
        const displayName = user.displayName || 'User';
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

        authBtn.innerHTML = `
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                `;

        // Add user info
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
                    <div class="user-avatar">${initials.substring(0, 2)}</div>   
                `;

        // Replace or add user info
        const existingUserInfo = authContainer.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.replaceWith(userInfo);
        } else {
            authContainer.insertBefore(userInfo, authBtn);
        }

        // Enable app content
        appContent.style.display = 'flex';
    } else {
        // User is signed out
        authBtn.innerHTML = `
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Sign In</span>
                `;

        // Remove user info if exists
        const userInfo = authContainer.querySelector('.user-info');
        if (userInfo) userInfo.remove();

        // Show sign in prompt
        appContent.style.display = 'none';
        taskList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-lock"></i>
                        <h3>Sign In Required</h3>
                        <p>Please sign in to access your tasks across devices</p>
                        <button class="btn" id="signInPromptBtn" style="margin-top: 1rem;">
                            <i class="fas fa-sign-in-alt"></i> Sign In with Google
                        </button>
                    </div>
                `;

        document.getElementById('signInPromptBtn')?.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider);
        });
    }
}

// Initialize tasks with real-time updates
function initTasks(userId) {
    if (unsubscribeTasks) unsubscribeTasks();

    unsubscribeTasks = db.collection('users').doc(userId).collection('tasks')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            tasks = [];
            snapshot.forEach(doc => {
                const task = doc.data();
                task.id = doc.id;
                tasks.push(task);
            });
            renderTasks();
        }, error => {
            showNotification('Error loading tasks: ' + error.message, 'error');
        });
}

// Render tasks
function renderTasks() {
    if (tasks.length === 0) {
        taskList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No Tasks Yet</h3>
                        <p>Add a new task to get started</p>
                    </div>
                `;
        updateStats();
        return;
    }

    taskList.innerHTML = '';

    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.priority} ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;

        taskItem.innerHTML = `
                    <div class="task-check ${task.completed ? 'checked' : ''}">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="task-content">
                        <div class="task-title">${task.title}</div>
                        <div class="task-description">${task.description}</div>
                        <div class="task-meta">
                            <div class="task-priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</div>
                            <div>Added: ${formatDate(task.createdAt?.toDate())}</div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <div class="action-btn delete-btn">
                            <i class="fas fa-trash"></i>
                        </div>
                    </div>
                `;

        taskList.appendChild(taskItem);
    });

    // Add event listeners to task checkboxes
    document.querySelectorAll('.task-check').forEach(check => {
        check.addEventListener('click', function () {
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            const userId = auth.currentUser?.uid;

            if (!userId) return;

            // Update in Firebase
            db.collection('users').doc(userId).collection('tasks').doc(taskId)
                .update({
                    completed: !task.completed,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    if (!task.completed) {
                        createConfetti();
                    }
                })
                .catch(error => {
                    showNotification('Error updating task: ' + error.message, 'error');
                });
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.dataset.id;
            const userId = auth.currentUser?.uid;

            if (!userId) return;

            // Add animation
            taskItem.classList.add('fade-out');

            // Delete from Firebase
            db.collection('users').doc(userId).collection('tasks').doc(taskId)
                .delete()
                .then(() => {
                    showNotification('Task deleted successfully!', 'success');
                })
                .catch(error => {
                    showNotification('Error deleting task: ' + error.message, 'error');
                });
        });
    });

    updateStats();
}

// Format date for display
function formatDate(date) {
    if (!date) return 'Recently';

    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Update stats
function updateStats() {
    totalTasksEl.textContent = tasks.length;
    completedTasksEl.textContent = tasks.filter(t => t.completed).length;
    pendingTasksEl.textContent = tasks.filter(t => !t.completed).length;
    highPriorityEl.textContent = tasks.filter(t => t.priority === 'high').length;
}

// Add new task
function addTask() {
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const priority = document.querySelector('.priority-option.selected').dataset.priority;
    const userId = auth.currentUser?.uid;

    if (!userId) {
        showNotification('Please sign in to add tasks', 'error');
        return;
    }

    if (!title) {
        taskTitleInput.focus();
        showNotification('Please enter a task title', 'error');
        return;
    }

    const newTask = {
        title,
        description: description || 'No description',
        priority,
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Disable button while saving
    addTaskBtn.disabled = true;
    addTaskBtn.innerHTML = `<div class="loading"></div> Adding...`;

    // Add to Firebase
    db.collection('users').doc(userId).collection('tasks')
        .add(newTask)
        .then(() => {
            // Reset form
            taskTitleInput.value = '';
            taskDescriptionInput.value = '';
            taskTitleInput.focus();

            showNotification('Task added successfully!', 'success');
        })
        .catch(error => {
            showNotification('Error adding task: ' + error.message, 'error');
        })
        .finally(() => {
            addTaskBtn.disabled = false;
            addTaskBtn.innerHTML = `<i class="fas fa-plus"></i> Add Task`;
        });
}

// Show notification
function showNotification(message, type) {
    notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            `;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Create confetti effect
function createConfetti() {
    const colors = ['#4361ee', '#f72585', '#4cc9f0', '#4895ef', '#7209b7'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.width = `${Math.random() * 8 + 4}px`;
        confetti.style.height = confetti.style.width;
        confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;
        document.body.appendChild(confetti);

        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Event listeners
addTaskBtn.addEventListener('click', addTask);
taskTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

