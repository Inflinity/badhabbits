import { useState, useEffect } from 'react'
import { ActiveTask } from '../lib/state'
import './ActiveTaskScreen.css'

interface ActiveTaskScreenProps {
  task: ActiveTask
  onComplete: () => void
  onCancel: () => void
}

export default function ActiveTaskScreen({ task, onComplete, onCancel }: ActiveTaskScreenProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [progress, setProgress] = useState<number>(0)

  const totalDuration = task.task.duration * 60 * 1000 // in ms

  useEffect(() => {
    const endTime = task.startedAt + totalDuration

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const elapsed = totalDuration - remaining

      setTimeLeft(remaining)
      setProgress((elapsed / totalDuration) * 100)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [task.startedAt, totalDuration])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const timerExpired = timeLeft === 0

  return (
    <div className="active-screen">
      <div className="active-content">
        <p className="active-label">YOUR TASK</p>

        <h1 className="active-title">{task.task.title}</h1>

        <div className="timer-container">
          <svg className="timer-ring" viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              className="timer-ring-bg"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="12"
            />
            {/* Progress ring */}
            <circle
              className="timer-ring-progress"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="timer-inner">
            {timerExpired ? (
              <span className="timer-done">Done!</span>
            ) : (
              <>
                <span className="timer-value">{formatTime(timeLeft)}</span>
                <span className="timer-label">remaining</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="active-buttons">
        <button className="btn-complete" onClick={onComplete}>
          {timerExpired ? "Claim your reward!" : "I did it!"}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
