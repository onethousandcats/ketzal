import { useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Todo {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = 'ketzal-todos'

function load(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>(load)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const add = () => {
    const text = input.trim()
    if (!text) return
    setTodos(prev => [...prev, { id: `${Date.now()}`, text, done: false }])
    setInput('')
    inputRef.current?.focus()
  }

  const toggle = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const remove = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id))

  const clearDone = () =>
    setTodos(prev => prev.filter(t => !t.done))

  const doneCount = todos.filter(t => t.done).length

  return (
    <div className="todo">
      {/* Input row */}
      <div className="todo-input-row">
        <input
          ref={inputRef}
          className="todo-input"
          placeholder="Add a task…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="todo-add-btn" onClick={add} aria-label="Add task">+</button>
      </div>

      {/* List */}
      {todos.length === 0 ? (
        <div className="todo-empty">No tasks yet</div>
      ) : (
        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo.id} className={`todo-item${todo.done ? ' todo-item--done' : ''}`}>
              <button
                className={`todo-check${todo.done ? ' todo-check--done' : ''}`}
                onClick={() => toggle(todo.id)}
                aria-label={todo.done ? 'Mark incomplete' : 'Mark complete'}
              />
              <span className="todo-text">{todo.text}</span>
              <button
                className="todo-delete"
                onClick={() => remove(todo.id)}
                aria-label="Delete"
              >×</button>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      {doneCount > 0 && (
        <div className="todo-footer">
          <span className="todo-count">{doneCount} done</span>
          <button className="todo-clear" onClick={clearDone}>Clear done</button>
        </div>
      )}
    </div>
  )
}
