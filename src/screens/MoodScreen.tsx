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
}

export default function MoodScreen({
  state,
  activeTask,
  onMoodSelect,
  onSpendCoins,
  onInvestCoins,
  onTrackRecord,
  onSettings,
  onResumeTask
}: MoodScreenProps) {

  const handleMoodClick = (moodId: string) => {
    onMoodSelect(moodId)
  }

  // Calculate time left for mini timer
  const getTimeLeft = () => {
    if (!activeTask) return null
    const endTime = activeTask.startedAt + activeTask.task.duration * 60 * 1000
    const remaining = Math.max(0, endTime - Date.now())
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="mood-screen">
      {/* Header with logo and action bubbles */}
      <div className="mood-header">
        <img src="/graphics/logo_512x512.png" alt="Bad Habbit" className="header-logo" />

        <div className="action-bubbles">
          {/* Mini timer bubble - shows when task is active */}
          {activeTask && (
            <button className="action-bubble timer-bubble" onClick={onResumeTask}>
              <span className="bubble-time">{getTimeLeft()}</span>
            </button>
          )}

          {/* Tip bubbles - placeholder for future tips */}
          <div className="action-bubble tip-bubble">
            <span className="bubble-icon">?</span>
          </div>

          <button className="action-bubble settings-bubble" onClick={onSettings}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Points display */}
      <div className="points-section">
        <span className="points-value">{state.points}</span>
        <span className="points-label">points</span>
      </div>

      {/* Main instruction */}
      <p className="mood-instruction">Earn points by completing a task:</p>

      {/* Mood grid */}
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
      </div>

      {/* Action buttons */}
      <div className="mood-buttons">
        <button className="btn-action btn-spend" onClick={onSpendCoins}>
          spend coins (bad!)
        </button>

        <button className="btn-action btn-invest" onClick={onInvestCoins}>
          invest coins (good!)
        </button>

        <button className="btn-action btn-track" onClick={onTrackRecord}>
          track record
        </button>
      </div>
    </div>
  )
}
