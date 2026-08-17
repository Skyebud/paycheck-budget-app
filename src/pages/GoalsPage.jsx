import { useState } from 'react'
import EmptyState from '../components/EmptyState'
import { money, uid } from '../lib/format'

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

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Goals</h1></div>
      </header>

      <section className="section-block flush-top">
        {data.goals.length ? (
          <div className="goal-list">
            {data.goals.map((goal) => {
              const percent =
                Number(goal.target) > 0
                  ? Math.min(
                      100,
                      (Number(goal.saved || 0) / Number(goal.target)) * 100,
                    )
                  : 0

              return (
                <div className="goal-row" key={goal.id}>
                  <div className="goal-main">
                    <strong>{goal.name}</strong>
                    <span>
                      {money(goal.saved)} of {money(goal.target)}
                    </span>
                    <div className="progress">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    value={goal.saved}
                    onChange={(event) =>
                      setData((current) => ({
                        ...current,
                        goals: current.goals.map((item) =>
                          item.id === goal.id
                            ? {
                                ...item,
                                saved: Number(event.target.value || 0),
                              }
                            : item,
                        ),
                      }))
                    }
                  />

                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        goals: current.goals.filter(
                          (item) => item.id !== goal.id,
                        ),
                      }))
                    }
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No goals yet." />
        )}
      </section>

      <form className="inline-add" onSubmit={addGoal}>
        <input
          placeholder="Goal name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
        <button className="primary-button">Add goal</button>
      </form>
    </div>
  )
}
