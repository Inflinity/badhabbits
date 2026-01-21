import { useState, useEffect, useCallback } from 'react'
import { ActiveTask } from '../lib/state'
import './ActiveTaskScreen.css'

interface ActiveTaskScreenProps {
  task: ActiveTask
  onComplete: () => void
  onExpired: () => void
}

export default function ActiveTaskScreen({ task, onComplete, onExpired }: ActiveTaskScreenProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [progress, setProgress] = useState<number>(0)
  const [exploded, setExploded] = useState(false)

  const totalDuration = task.task.duration * 60 * 1000 // in ms

  // Vibrate function
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 400ms
      navigator.vibrate([200, 100, 200, 100, 400])
    }
  }, [])

  useEffect(() => {
    const endTime = task.startedAt + totalDuration

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const elapsed = totalDuration - remaining

      setTimeLeft(remaining)
      setProgress((elapsed / totalDuration) * 100)

      // Time's up - BOOM!
      if (remaining === 0 && !exploded) {
        setExploded(true)
        vibrate()
        // Wait for explosion animation, then trigger penalty
        setTimeout(() => {
          onExpired()
        }, 2000)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100) // Update more frequently for smoother countdown

    return () => clearInterval(interval)
  }, [task.startedAt, totalDuration, exploded, vibrate, onExpired])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Calculate urgency level for color changes
  const urgencyLevel = timeLeft < 10000 ? 'critical' : timeLeft < 30000 ? 'warning' : 'normal'

  if (exploded) {
    return (
      <div className="active-screen exploded">
        <div className="explosion-container">
          <div className="explosion-emoji">💥</div>
          <h1 className="explosion-text">BOOM!</h1>
          <p className="explosion-penalty">-1 Point</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`active-screen ${urgencyLevel}`}>
      <div className="active-content">
        <p className="active-label">DO IT NOW!</p>

        <h1 className="active-title">{task.task.title}</h1>

        <div className={`countdown-display ${urgencyLevel}`}>
          <span className="countdown-value">{formatTime(timeLeft)}</span>
        </div>

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
              className={`timer-ring-progress ${urgencyLevel}`}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="timer-inner">
            <span className="bomb-emoji">💣</span>
          </div>
        </div>
      </div>

      <div className="active-buttons">
        <button className="btn-complete" onClick={onComplete}>
          I did it!
        </button>
      </div>
    </div>
  )
}
