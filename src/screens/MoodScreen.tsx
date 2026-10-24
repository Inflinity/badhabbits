import { useState, useEffect } from 'react'
import { MOODS, AppState, ActiveTask } from '../lib/state'
import './MoodScreen.css'

interface MoodScreenProps {
  state: AppState
  activeTask: ActiveTask | null
  onMoodSelect: (moodId: string) => void
  onSpendCoins: () => void
  onInvestCoins: () => void
  onTrackRecord: () => void
  onSettings: () => void
  onResumeTask: () => void
  onMessages: () => void
  onProfile: () => void
  onTodoList: () => void
}

export default function MoodScreen({
  state,
  activeTask,
  onMoodSelect,
  onSpendCoins,
  onInvestCoins,
  onTrackRecord,
  onSettings,
  onResumeTask,
  onMessages,
  onProfile,
  onTodoList
}: MoodScreenProps) {
  const [timerDisplay, setTimerDisplay] = useState<string | null>(null)

  const handleMoodClick = (moodId: string) => {
    onMoodSelect(moodId)
  }

  // Check if profile is incomplete (for missing info badge)
  const isProfileIncomplete = !state.onboardingComplete

  // Update timer display every second
  useEffect(() => {
    if (!activeTask) {
      setTimerDisplay(null)
      return
    }

    const updateTimer = () => {
      const endTime = activeTask.startedAt + activeTask.task.duration * 60 * 1000
      const remaining = Math.max(0, endTime - Date.now())
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimerDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeTask])

  return (
    <div className="mood-screen">
      {/* Header with avatar */}
      <div className="mood-header">
        <button className="avatar-container" onClick={onProfile}>
          <div className="avatar">
            <img
              src="/graphics/defaultavatar_512x512.png"
              alt="Avatar"
              className="avatar-image"
            />
          </div>
          {isProfileIncomplete && (
            <div className="avatar-badge">
              <span className="badge-icon">!</span>
              <span className="badge-text">missing info</span>
            </div>
          )}
        </button>

        {/* Points display with diamond - centered */}
        <div className="points-section">
          <img
            src="/graphics/point_512x512.png"
            alt="Points"
            className="points-diamond"
          />
          <span className="points-value" id="points-target">{state.points}</span>
        </div>

        {/* Empty spacer for balance */}
        <div className="header-spacer"></div>
      </div>

      {/* Right side action bubbles */}
      <div className="action-bubbles-right">
        {activeTask && (
          <button className="action-bubble timer-bubble" onClick={onResumeTask}>
            <span className="bubble-time">{timerDisplay}</span>
          </button>
        )}

        <button className="action-bubble todo-bubble" onClick={onTodoList}>
          <img src="/graphics/todo_512x512.png" alt="Todo List" />
        </button>

        <a className="action-bubble breathe-bubble" href="/atem/" aria-label="Changes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 9c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5-1"></path>
            <path d="M2 15c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5-1"></path>
          </svg>
        </a>

        <a className="action-bubble map-bubble" href="/karte/" aria-label="Karte">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"></path>
            <path d="M9 4v14M15 6v14"></path>
          </svg>
        </a>

        <a className="action-bubble map-bubble" href="/figur/" aria-label="Figur und Kalorien">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3"></circle>
            <path d="M12 8v7M8 11h8M12 15l-3 6M12 15l3 6"></path>
          </svg>
        </a>

        <a className="action-bubble crusaders-bubble" href="/crusaders/" aria-label="Crusaders">
          <img src="/crusaders/icon-192.png" alt="" />
        </a>

        <button className="action-bubble tip-bubble">
          <span className="bubble-icon">?</span>
        </button>

        <button className="action-bubble settings-bubble" onClick={onSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      {/* Main instruction */}
      <p className="mood-instruction">earn points by completing a task:</p>

      {/* Mood grid - 4 moods + 1 spend card */}
      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            className="mood-card"
            onClick={() => handleMoodClick(mood.id)}
          >
            <div className="mood-image-container">
              <img
                src={mood.image}
                alt={mood.name}
                className="mood-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement!.classList.add('no-image')
                }}
              />
            </div>
            <span className="mood-label">{mood.name}</span>
          </button>
        ))}

        {/* 5th card - Spend Points */}
        <button className="mood-card spend-card" onClick={onSpendCoins}>
          <div className="mood-image-container">
            <img
              src="/graphics/spend_512x512.png"
              alt="Spend Points"
              className="mood-image"
            />
          </div>
          <span className="mood-label spend-label">spend points!</span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="mood-buttons">
        <button className="btn-action btn-invest" onClick={onInvestCoins}>
          invest coins (good!)
        </button>

        <button className="btn-action btn-track" onClick={onTrackRecord}>
          track record
        </button>
      </div>

      {/* Message bubble - bottom left */}
      <button className="message-bubble" onClick={onMessages}>
        <div className="message-content">
          <span className="message-text">no new messages</span>
        </div>
        <div className="message-tail"></div>
      </button>
    </div>
  )
}
