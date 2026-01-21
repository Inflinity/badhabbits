import { useState, useEffect } from 'react'
import { AppState, DEFAULT_TASKS, Task } from '../lib/state'
import './TaskScreen.css'

interface TaskScreenProps {
  state: AppState
  updateState: (updates: Partial<AppState>) => void
}

export default function TaskScreen({ state, updateState }: TaskScreenProps) {
  const [view, setView] = useState<'tasks' | 'rewards' | 'active'>('tasks')
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Get reward info for a task
  const getReward = (rewardId: string) => {
    return state.rewards.find(r => r.id === rewardId)
  }

  // Start a task
  const startTask = (task: Task) => {
    updateState({
      currentTask: {
        task,
        startedAt: Date.now(),
      }
    })
    setView('active')
  }

  // Complete the active task
  const completeTask = () => {
    if (!state.currentTask) return

    const reward = getReward(state.currentTask.task.rewardId)
    if (reward) {
      const updatedRewards = state.rewards.map(r =>
        r.id === reward.id
          ? { ...r, earned: r.earned + state.currentTask!.task.rewardAmount }
          : r
      )
      updateState({
        rewards: updatedRewards,
        points: state.points + 1,
        completedTasks: state.completedTasks + 1,
        currentTask: null,
      })
    }
    setView('tasks')
  }

  // Cancel the active task
  const cancelTask = () => {
    updateState({ currentTask: null })
    setView('tasks')
  }

  // Spend a reward
  const spendReward = (rewardId: string) => {
    const reward = state.rewards.find(r => r.id === rewardId)
    if (reward && reward.earned > 0) {
      const updatedRewards = state.rewards.map(r =>
        r.id === rewardId ? { ...r, earned: r.earned - 1 } : r
      )
      updateState({ rewards: updatedRewards })
    }
  }

  // Timer effect
  useEffect(() => {
    if (!state.currentTask) return

    const endTime = state.currentTask.startedAt + (state.currentTask.task.duration * 60 * 1000)

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now())
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [state.currentTask])

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Check if timer expired
  const timerExpired = timeLeft === 0 && state.currentTask

  // Auto-switch to active view if there's an active task
  useEffect(() => {
    if (state.currentTask && view === 'tasks') {
      setView('active')
    }
  }, [state.currentTask])

  return (
    <div className="task-screen">
      {/* Header */}
      <div className="header">
        <div className="streak">
          🔥 Day {state.streak}
        </div>
        <div className="points">
          ⭐ {state.points} pts
        </div>
      </div>

      {/* Active Task View */}
      {view === 'active' && state.currentTask && (
        <div className="active-task-view">
          <div className="active-task-content">
            <p className="active-label">CURRENT TASK</p>
            <h2 className="active-title">{state.currentTask.task.title}</h2>

            <div className={`timer-display ${timerExpired ? 'expired' : ''}`}>
              {timerExpired ? (
                <span className="timer-done">TIME'S UP!</span>
              ) : (
                <>
                  <span className="timer-value">{formatTime(timeLeft)}</span>
                  <span className="timer-label">remaining</span>
                </>
              )}
            </div>

            <div className="active-reward">
              <span className="active-reward-emoji">
                {getReward(state.currentTask.task.rewardId)?.emoji}
              </span>
              <span>
                +{state.currentTask.task.rewardAmount} {getReward(state.currentTask.task.rewardId)?.name}
              </span>
            </div>
          </div>

          <div className="active-buttons">
            {timerExpired ? (
              <button className="btn-complete" onClick={completeTask}>
                ✓ Done — Claim Reward
              </button>
            ) : (
              <button className="btn-complete" onClick={completeTask}>
                ✓ I did it early!
              </button>
            )}
            <button className="btn-cancel" onClick={cancelTask}>
              ✗ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tasks View */}
      {view === 'tasks' && !state.currentTask && (
        <div className="tasks-view">
          <h2 className="section-title">Choose a task</h2>
          <div className="tasks-list">
            {DEFAULT_TASKS.map(task => {
              const reward = getReward(task.rewardId)
              return (
                <button
                  key={task.id}
                  className="task-item"
                  onClick={() => startTask(task)}
                >
                  <div className="task-item-content">
                    <p className="task-item-title">{task.title}</p>
                    <p className="task-item-meta">
                      ⏱️ {task.duration} min
                    </p>
                  </div>
                  <div className="task-item-reward">
                    <span className="task-reward-emoji">{reward?.emoji}</span>
                    <span className="task-reward-amount">+{task.rewardAmount}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Rewards View */}
      {view === 'rewards' && (
        <div className="rewards-view">
          <h2 className="section-title">Your rewards</h2>
          <div className="rewards-list-full">
            {state.rewards.map(reward => (
              <div key={reward.id} className="reward-row">
                <div className="reward-info">
                  <span className="reward-emoji-large">{reward.emoji}</span>
                  <div>
                    <p className="reward-name">{reward.name}</p>
                    <p className="reward-count">Available: {reward.earned}</p>
                  </div>
                </div>
                <button
                  className={`btn-spend ${reward.earned === 0 ? 'disabled' : ''}`}
                  onClick={() => spendReward(reward.id)}
                  disabled={reward.earned === 0}
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      {!state.currentTask && (
        <nav className="bottom-nav">
          <button
            className={`nav-btn ${view === 'tasks' ? 'active' : ''}`}
            onClick={() => setView('tasks')}
          >
            <span className="nav-icon">💪</span>
            <span className="nav-label">Tasks</span>
          </button>
          <button
            className={`nav-btn ${view === 'rewards' ? 'active' : ''}`}
            onClick={() => setView('rewards')}
          >
            <span className="nav-icon">🎁</span>
            <span className="nav-label">Rewards</span>
          </button>
        </nav>
      )}
    </div>
  )
}
