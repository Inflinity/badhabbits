import { useState } from 'react'
import { MOODS, AppState } from '../lib/state'
import './MoodScreen.css'

interface MoodScreenProps {
  state: AppState
  onMoodSelect: (moodId: string) => void
  onRedeem: () => void
  onSchweinehund: () => void
  onConfess: () => void
  onSendPoints: () => void
  onSettings: () => void
}

export default function MoodScreen({ state, onMoodSelect, onRedeem, onSchweinehund, onConfess, onSendPoints, onSettings }: MoodScreenProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  const handleMoodClick = (moodId: string) => {
    setSelectedMood(moodId)
  }

  const handleGetTask = () => {
    if (selectedMood) {
      onMoodSelect(selectedMood)
    }
  }

  return (
    <div className="mood-screen">
      {/* Header with user ID, points and settings */}
      <div className="mood-header">
        <span className="user-id">#{state.oderId}</span>
        <div className="header-right">
          <span className="points-display">{state.points} pts</span>
          <button className="settings-btn" onClick={onSettings} aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>

      <h1 className="mood-title">Mood:</h1>

      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
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
              <div className="mood-emoji-fallback">
                {mood.id === 'commute' && '🚇'}
                {mood.id === 'couch' && '🛋️'}
                {mood.id === 'social' && '👥'}
                {mood.id === 'bed' && '🛏️'}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mood-buttons">
        <button
          className={`btn-primary ${selectedMood ? 'active' : ''}`}
          onClick={handleGetTask}
          disabled={!selectedMood}
        >
          Give me a task!
        </button>

        <button className="btn-secondary" onClick={onRedeem}>
          Spend points on myself!
        </button>

        <button className="btn-schweinehund" onClick={onSchweinehund}>
          Feed the Schweinehund!
        </button>

        <button className="btn-send" onClick={onSendPoints}>
          Send points to a friend
        </button>

        <button className="btn-confess" onClick={onConfess}>
          Ah, I did something stupid...
        </button>
      </div>
    </div>
  )
}
