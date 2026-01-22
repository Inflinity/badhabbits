import { useState, useEffect, useCallback, useRef } from 'react'
import { ActiveTask } from '../lib/state'
import './ActiveTaskScreen.css'

interface ActiveTaskScreenProps {
  task: ActiveTask
  onComplete: () => void
  onExpired: () => void
  onBack: () => void
}

export default function ActiveTaskScreen({ task, onComplete, onExpired, onBack }: ActiveTaskScreenProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [progress, setProgress] = useState<number>(0)
  const [exploded, setExploded] = useState(false)
  const animationRef = useRef<number | null>(null)

  const totalDuration = task.task.duration * 60 * 1000 // in ms

  // Vibrate function
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
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
        setTimeout(() => {
          onExpired()
        }, 2000)
        return
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(updateTimer)
    }

    // Start animation loop
    animationRef.current = requestAnimationFrame(updateTimer)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [task.startedAt, totalDuration, exploded, vibrate, onExpired])

  // Format time with milliseconds
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10) // Show centiseconds
    return {
      main: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      ms: `.${milliseconds.toString().padStart(2, '0')}`
    }
  }

  // Calculate urgency level - more granular for smoother transitions
  const getUrgencyLevel = () => {
    const percentLeft = (timeLeft / totalDuration) * 100
    if (percentLeft <= 5) return 'critical'
    if (percentLeft <= 15) return 'danger'
    if (percentLeft <= 30) return 'warning'
    return 'normal'
  }

  const urgencyLevel = getUrgencyLevel()
  const time = formatTime(timeLeft)

  if (exploded) {
    return (
      <div className="active-screen exploded">
        <div className="explosion-container">
          <div className="explosion-emoji">!</div>
          <p className="explosion-text">Time's up</p>
          <p className="explosion-penalty">-1 point</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`active-screen ${urgencyLevel}`}>
      {/* Back button */}
      <button className="back-btn" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <div className="active-content">
        <p className="active-label">do it now</p>

        <p className="active-title">{task.task.title}</p>

        {/* Pomodoro-style circular timer */}
        <div className="pomodoro-container">
          <svg className="pomodoro-ring" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              className="pomodoro-bg"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              className={`pomodoro-progress ${urgencyLevel}`}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>

          <div className={`pomodoro-inner ${urgencyLevel}`}>
            <div className={`countdown-display ${urgencyLevel}`}>
              <span className="countdown-main">{time.main}</span>
              <span className="countdown-ms">{time.ms}</span>
            </div>
          </div>
        </div>

        {/* Urgency indicator bar */}
        <div className={`urgency-bar ${urgencyLevel}`}>
          <div
            className="urgency-fill"
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      </div>

      <div className="active-buttons">
        <button className="btn-complete" onClick={onComplete}>
          done
        </button>
      </div>
    </div>
  )
}
