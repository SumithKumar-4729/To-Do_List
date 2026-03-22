# To-Do List

A simple browser-based task manager built with vanilla HTML, CSS, and JavaScript.

## Features

- Add, complete, edit, and delete tasks
- Add, complete, edit, and delete subtasks
- Search tasks and subtasks
- Filter by status (`All`, `Active`, `Completed`)
- Filter by due date (`Today`, `Upcoming`, `Overdue`, `No Date`)
- Due date set/clear controls per task
- Undo delete (task/subtask)
- Task count badge (`active` and `done`)
- Dark/Light theme toggle (saved in localStorage)
- Keyboard shortcuts for faster task navigation and deletion
- Data persistence using localStorage

## Project Structure

- `index.html` — App layout and UI containers
- `style.css` — Styling and theme rules
- `js/main.js` — Main app logic and interactions
- `js/storage.js` — localStorage helpers

## How to Run

No build step or dependencies are required.

1. Open the project folder.
2. Open `index.html` in your browser.

## Keyboard Hints

- Click task header or `▸` to expand/collapse subtasks
- Double-click task/subtask text to edit
- Press `Delete` on a focused task/subtask to remove it

## Storage

Tasks, theme, and expansion state are saved in the browser via `localStorage`.

## GitHub Push (Quick Steps)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SumithKumar-4729/To-Do_List.git
git push -u origin main
```

If remote already exists:

```bash
git remote set-url origin https://github.com/SumithKumar-4729/To-Do_List.git
```
