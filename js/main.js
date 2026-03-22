import { getTasks, saveTasks } from "./storage.js";

let tasks = getTasks().map((task) => ({
    ...task,
    dueDate: task.dueDate || "",
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
}));

const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDateInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const dueFilter = document.getElementById("dueFilter");
const emptyState = document.getElementById("emptyState");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const countBadge = document.getElementById("countBadge");
const undoToast = document.getElementById("undoToast");
const undoBtn = document.getElementById("undoBtn");
const undoMessage = document.getElementById("undoMessage");

let searchText = "";
let selectedStatus = "all";
let selectedDue = "all";
let currentTheme = localStorage.getItem("theme") || "dark";
let pendingUndo = null;
let audioContext = null;
const expandedTasks = new Set(JSON.parse(localStorage.getItem("expandedTasks") || "[]").map(String));

const generateId = () => Date.now();

const getTodayISO = () => new Date().toISOString().split("T")[0];

const saveExpandedTasks = () => {
    localStorage.setItem("expandedTasks", JSON.stringify(Array.from(expandedTasks)));
};

const isTaskExpanded = (taskId) => expandedTasks.has(String(taskId));

const setTaskExpanded = (taskId, isExpanded) => {
    const key = String(taskId);
    if (isExpanded) {
        expandedTasks.add(key);
    } else {
        expandedTasks.delete(key);
    }
    saveExpandedTasks();
};

const toggleTaskExpanded = (taskId) => {
    setTaskExpanded(taskId, !isTaskExpanded(taskId));
};

const playDeleteSound = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
};

const playUndoSound = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(280, now);
    oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.09);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.13);
};

const playAddSound = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(460, now);
    oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.08);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.11);
};

const playErrorSound = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.07);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
};

const formatDueDate = (dateString) => {
    if (!dateString) return "No due date";

    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
};

const isValidISODate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
};

const isOverdueTask = (task) => {
    if (!task.dueDate || task.completed) return false;
    return task.dueDate < getTodayISO();
};

const matchesStatusFilter = (task) => {
    if (selectedStatus === "active") return !task.completed;
    if (selectedStatus === "completed") return task.completed;
    return true;
};

const matchesDueFilter = (task) => {
    const today = getTodayISO();

    if (selectedDue === "all") return true;
    if (selectedDue === "no-date") return !task.dueDate;
    if (!task.dueDate) return false;

    if (selectedDue === "today") return task.dueDate === today;
    if (selectedDue === "upcoming") return task.dueDate > today;
    if (selectedDue === "overdue") return task.dueDate < today && !task.completed;

    return true;
};

/* ================= THEME ================= */

const applyTheme = (theme) => {
    document.body.classList.toggle("light-theme", theme === "light");
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === "light" ? "Dark Mode" : "Light Mode";
    }
};

const toggleTheme = () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", currentTheme);
    applyTheme(currentTheme);
};

applyTheme(currentTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
}

/* ================= SEARCH ================= */

searchInput.addEventListener("input", (e) => {
    searchText = e.target.value.toLowerCase();
    renderTasks();
});

statusFilter?.addEventListener("change", (e) => {
    selectedStatus = e.target.value;
    renderTasks();
});

dueFilter?.addEventListener("change", (e) => {
    selectedDue = e.target.value;
    renderTasks();
});

/* ================= STATE HELPERS ================= */

const updateState = () => {
    saveTasks(tasks);
    renderTasks();
};

const updateCountBadge = () => {
    if (!countBadge) return;
    const doneCount = tasks.filter(task => task.completed).length;
    const activeCount = tasks.length - doneCount;
    countBadge.textContent = `${activeCount} active · ${doneCount} done`;
};

const hideUndoToast = () => {
    if (!undoToast) return;
    undoToast.classList.remove("show");
};

const showUndoToast = (message, restore) => {
    if (!undoToast || !undoBtn || !undoMessage) return;

    if (pendingUndo?.timeoutId) {
        clearTimeout(pendingUndo.timeoutId);
    }

    undoMessage.textContent = message;
    undoToast.classList.add("show");

    pendingUndo = {
        restore,
        timeoutId: window.setTimeout(() => {
            hideUndoToast();
            pendingUndo = null;
        }, 5000)
    };
};

undoBtn?.addEventListener("click", () => {
    if (!pendingUndo) return;
    const { restore, timeoutId } = pendingUndo;
    clearTimeout(timeoutId);
    playUndoSound();
    restore();
    pendingUndo = null;
    hideUndoToast();
});

const animateAndRemoveTask = (taskId, onRemoved) => {
    const taskCard = document.querySelector(`.task[data-task-id="${taskId}"]`);
    if (!taskCard) {
        deleteTaskById(taskId);
        onRemoved?.();
        return;
    }

    taskCard.classList.add("task-removing");
    taskCard.addEventListener("animationend", () => {
        deleteTaskById(taskId);
        onRemoved?.();
    }, { once: true });
};

const startInlineEdit = (element, currentValue, onSave) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    input.className = "inline-edit";

    const commit = () => {
        const value = input.value.trim();
        if (value && value !== currentValue) {
            onSave(value);
        } else {
            renderTasks();
        }
    };

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            commit();
        }
        if (e.key === "Escape") {
            renderTasks();
        }
    });

    input.addEventListener("blur", commit, { once: true });

    element.replaceWith(input);
    input.focus();
    input.select();
};

const deleteTaskById = (id) => {
    tasks = tasks.filter(t => t.id !== id);
    updateState();
};

const deleteSubtaskById = (task, subId, shouldOfferUndo = true) => {
    const subtaskIndex = task.subtasks.findIndex(s => s.id === subId);
    if (subtaskIndex === -1) return;

    const removedSubtask = task.subtasks[subtaskIndex];
    task.subtasks = task.subtasks.filter(s => s.id !== subId);
    playDeleteSound();
    updateState();

    if (shouldOfferUndo) {
        showUndoToast("Subtask deleted", () => {
            const targetTask = tasks.find(t => t.id === task.id);
            if (!targetTask) return;
            targetTask.subtasks.splice(subtaskIndex, 0, removedSubtask);
            updateState();
        });
    }
};

/* ================= ADD TASK ================= */

const addTask = () => {
    const text = taskInput.value.trim();
    if (!text) {
        playErrorSound();
        return;
    }

    // Check for duplicate (case insensitive)
    const alreadyExists = tasks.some(
        task => task.title.toLowerCase() === text.toLowerCase()
    );

    if (alreadyExists) {
        playErrorSound();
        alert("Task with this title already exists!");
        return;
    }

    tasks.push({
        id: generateId(),
        title: text,
        completed: false,
        dueDate: dueDateInput?.value || "",
        subtasks: []
    });

    playAddSound();
    taskInput.value = "";
    if (dueDateInput) dueDateInput.value = "";
    updateState();
};
addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
});

/* ================= RENDER ================= */

const renderTasks = () => {

    taskList.innerHTML = "";
    updateCountBadge();

    // Filter tasks based on search (task title OR subtask title)
    const filteredTasks = tasks.filter((task) => {
        const matchesSearch = task.title.toLowerCase().includes(searchText) ||
            task.subtasks.some(sub => sub.title.toLowerCase().includes(searchText));

        return matchesSearch && matchesStatusFilter(task) && matchesDueFilter(task);
    });

    taskList.style.display = filteredTasks.length ? "flex" : "none";
    if (emptyState) {
        emptyState.style.display = filteredTasks.length ? "none" : "block";
    }

    filteredTasks.forEach((task) => {

        const taskDiv = document.createElement("div");
        taskDiv.className = "task";
        taskDiv.setAttribute("tabindex", "0");
        taskDiv.dataset.taskId = String(task.id);
        taskDiv.classList.toggle("expanded", isTaskExpanded(task.id));

        /* ========= KEYBOARD HANDLER ========= */

        taskDiv.addEventListener("keydown", (e) => {

            const taskElements = Array.from(document.querySelectorAll(".task"));
            const currentIndex = taskElements.indexOf(taskDiv);

            if (e.key === "Delete") {
                const removedTask = structuredClone(task);
                const taskIndex = tasks.findIndex(t => t.id === task.id);
                playDeleteSound();
                animateAndRemoveTask(task.id, () => {
                    showUndoToast("Task deleted", () => {
                        tasks.splice(taskIndex, 0, removedTask);
                        updateState();
                    });
                });
            }

            if (e.key === "ArrowRight") {
                e.preventDefault(); // Prevents default arrow-key page/caret movement so we can move focus manually
                taskElements[currentIndex + 1]?.focus();
            }

            if (e.key === "ArrowLeft") {
                e.preventDefault(); // Prevents browser from moving caret/scrolling left while we switch task focus
                taskElements[currentIndex - 1]?.focus();
            }

            if (e.key === "ArrowDown") {
                e.preventDefault(); // Prevents page scrolling down from ArrowDown; uses custom next-row focus instead
                taskElements[currentIndex + 2]?.focus();
            }

            if (e.key === "ArrowUp") {
                e.preventDefault(); // Prevents page scrolling up from ArrowUp; uses custom previous-row focus instead
                taskElements[currentIndex - 2]?.focus();
            }
        });

        /* ================= HEADER ================= */

        const header = document.createElement("div");
        header.className = "task-header";

        const left = document.createElement("div");
        left.className = "task-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        checkbox.addEventListener("change", () => {
            task.completed = checkbox.checked;

            task.subtasks = task.subtasks.map(sub => ({
                ...sub,
                completed: task.completed
            }));

            updateState();
        });

        const title = document.createElement("span");
        title.textContent = task.title;
        title.className = "editable-text";
        title.title = "Double-click to edit";
        if (task.completed) title.classList.add("completed");

        title.addEventListener("dblclick", () => {
            startInlineEdit(title, task.title, (value) => {
                task.title = value;
                updateState();
            });
        });

        left.appendChild(checkbox);
        left.appendChild(title);

        const headerActions = document.createElement("div");
        headerActions.className = "task-actions";

        const expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "expand-btn";
        expandBtn.setAttribute("aria-label", `Toggle subtasks for ${task.title}`);
        expandBtn.textContent = isTaskExpanded(task.id) ? "▾" : "▸";

        expandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleTaskExpanded(task.id);
            renderTasks();
        });

        expandBtn.addEventListener("mouseenter", () => {
            if (window.matchMedia("(hover: hover)").matches && !isTaskExpanded(task.id)) {
                taskDiv.classList.add("preview-open");
            }
        });

        expandBtn.addEventListener("mouseleave", () => {
            taskDiv.classList.remove("preview-open");
        });

        header.addEventListener("click", (e) => {
            if (e.target.closest("button,input")) return;
            toggleTaskExpanded(task.id);
            renderTasks();
        });

        taskDiv.addEventListener("mouseleave", () => {
            taskDiv.classList.remove("preview-open");
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
            const removedTask = structuredClone(task);
            const taskIndex = tasks.findIndex(t => t.id === task.id);
            playDeleteSound();
            animateAndRemoveTask(task.id, () => {
                showUndoToast("Task deleted", () => {
                    tasks.splice(taskIndex, 0, removedTask);
                    updateState();
                });
            });
        });

        headerActions.appendChild(expandBtn);
        headerActions.appendChild(deleteBtn);

        header.appendChild(left);
        header.appendChild(headerActions);

        taskDiv.appendChild(header);

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const dueLabel = document.createElement("span");
        dueLabel.className = "due-label";
        dueLabel.textContent = `Due: ${formatDueDate(task.dueDate)}`;
        if (isOverdueTask(task)) {
            dueLabel.classList.add("overdue");
        }

        meta.appendChild(dueLabel);

        const dueActions = document.createElement("div");
        dueActions.className = "due-actions";

        const setDueBtn = document.createElement("button");
        setDueBtn.type = "button";
        setDueBtn.className = "mini-btn";
        setDueBtn.textContent = "Set";
        setDueBtn.addEventListener("click", () => {
            const nextValue = prompt("Enter due date (YYYY-MM-DD). Leave empty to remove.", task.dueDate || "");
            if (nextValue === null) return;

            const cleaned = nextValue.trim();
            if (!cleaned) {
                task.dueDate = "";
                updateState();
                return;
            }

            if (!isValidISODate(cleaned)) {
                playErrorSound();
                alert("Please enter a valid date in YYYY-MM-DD format.");
                return;
            }

            task.dueDate = cleaned;
            updateState();
        });

        const clearDueBtn = document.createElement("button");
        clearDueBtn.type = "button";
        clearDueBtn.className = "mini-btn";
        clearDueBtn.textContent = "Clear";
        clearDueBtn.addEventListener("click", () => {
            task.dueDate = "";
            updateState();
        });

        dueActions.appendChild(setDueBtn);
        dueActions.appendChild(clearDueBtn);
        meta.appendChild(dueActions);
        taskDiv.appendChild(meta);

        const subtaskSection = document.createElement("div");
        subtaskSection.className = "task-subtasks";

        /* ================= SUBTASK INPUT ================= */

        const subContainer = document.createElement("div");
        subContainer.className = "subtask-input";

        const subInput = document.createElement("input");
        subInput.placeholder = "Add subtask";

        const addSubtask = () => {
            const subText = subInput.value.trim();
            if (!subText) {
                playErrorSound();
                return;
            }

            task.subtasks.push({
                id: generateId(),
                title: subText,
                completed: false
            });

            subInput.value = "";
            updateState();
        };

        const subBtn = document.createElement("button");
        subBtn.textContent = "+";
        subBtn.addEventListener("click", addSubtask);

        subInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addSubtask();
        });

        subContainer.appendChild(subInput);
        subContainer.appendChild(subBtn);
        subtaskSection.appendChild(subContainer);

        /* ================= SUBTASK LIST ================= */

        task.subtasks.forEach((sub) => {

            const subDiv = document.createElement("div");
            subDiv.className = "subtask";
            subDiv.setAttribute("tabindex", "0");

            subDiv.addEventListener("keydown", (e) => {
                if (e.key === "Delete") {
                    e.stopPropagation();
                    deleteSubtaskById(task, sub.id);
                }
            });

            const subCheck = document.createElement("input");
            subCheck.type = "checkbox";
            subCheck.checked = sub.completed;

            subCheck.addEventListener("change", () => {
                sub.completed = subCheck.checked;
                task.completed = task.subtasks.every(s => s.completed);
                updateState();
            });

            const subTitle = document.createElement("span");
            subTitle.textContent = sub.title;
            subTitle.className = "editable-text";
            subTitle.title = "Double-click to edit";
            if (sub.completed) subTitle.classList.add("completed");

            subTitle.addEventListener("dblclick", () => {
                startInlineEdit(subTitle, sub.title, (value) => {
                    sub.title = value;
                    updateState();
                });
            });

            const deleteSubBtn = document.createElement("button");
            deleteSubBtn.textContent = "x";
            deleteSubBtn.className = "delete-btn";
            deleteSubBtn.addEventListener("click", () => deleteSubtaskById(task, sub.id, true));

            subDiv.appendChild(subCheck);
            subDiv.appendChild(subTitle);
            subDiv.appendChild(deleteSubBtn);

            subtaskSection.appendChild(subDiv);
        });

        taskDiv.appendChild(subtaskSection);

        taskList.appendChild(taskDiv);
    });
};

renderTasks();