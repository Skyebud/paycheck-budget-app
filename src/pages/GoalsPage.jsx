import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { money, uid } from '../lib/format'

function GoalRow({ goal, onUpdate, onDelete }) {
  const [saved, setSaved] = useState(String(Number(goal.saved || 0)))

  useEffect(() => {
    setSaved(String(Number(goal.saved || 0)))
  }, [goal.saved])

  const target = Number(goal.target || 0)
  const current = Number(goal.saved || 0)
  const remaining = Math.max(0, target - current)
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0

  const submit = (event) => {
    event.preventDefault()
    onUpdate(goal.id, Number(saved || 0))
  }

  return (
    <div className="goal-row-v2">
      <div className="goal-main-v2">
        <div className="goal-title-line">
          <div>
            <strong>{goal.name}</strong>
            <span>{money(current)} saved of {money(target)}</span>
          </div>
          <div className="goal-remaining">
            <span>Remaining</span>
            <strong>{money(remaining)}</strong>
          </div>
        </div>

        <div className="progress">
          <div style={{ width: `${percent}%` }} />
        </div>
      </div>

      <form className="goal-update" onSubmit={submit}>
        <label>
          <span>Saved</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={saved}
            onChange={(event) => setSaved(event.target.value)}
          />
        </label>
        <button type="submit" className="small-button">Update</button>
      </form>

      <button
        type="button"
        className="text-button danger"
        onClick={() => onDelete(goal.id)}
      >
        Delete
      </button>
    </div>
  )
}

export default function GoalsPage({ data, setData }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  const addGoal = (event) => {
    event.preventDefault()
    if (!name.trim()) return

    setData((current) => ({
      ...current,
      goals: [
        ...current.goals,
        {
          id: uid('goal'),
          name: name.trim(),
          target: Number(target || 0),
          saved: 0,
        },
      ],
    }))

    setName('')
    setTarget('')
  }

  const updateGoal = (id, saved) =>
    setData((current) => ({
      ...current,
      goals: current.goals.map((item) =>
        item.id === id ? { ...item, saved } : item,
      ),
    }))

  const deleteGoal = (id) =>
    setData((current) => ({
      ...current,
      goals: current.goals.filter((item) => item.id !== id),
    }))

  return (
    <div className="page goals-page">
      <header className="page-head">
        <div>
          <h1>Goals</h1>
          <p>Track money you are setting aside for something specific.</p>
        </div>
      </header>

      <section className="section-block flush-top">
        {data.goals.length ? (
          <div className="goal-list-v2">
            {data.goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onUpdate={updateGoal}
                onDelete={deleteGoal}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No goals yet." />
        )}
      </section>

      <section className="section-block goal-add-section">
        <div className="section-head">
          <h2>Add a goal</h2>
        </div>
        <form className="inline-add goal-inline-add" onSubmit={addGoal}>
          <input
            placeholder="Goal name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Target amount"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            required
          />
          <button className="primary-button">Add goal</button>
        </form>
      </section>
    </div>
  )
}
