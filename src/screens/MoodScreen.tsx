import { useState } from 'react'
import { MOODS, AppState } from '../lib/state'
import './MoodScreen.css'

interface MoodScreenProps {
  state: AppState
  onMoodSelect: (moodId: string) => void
  onRedeem: () => void
  onConfess: () => void
}

export default function MoodScreen({ state, onMoodSelect, onRedeem, onConfess }: MoodScreenProps) {
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
      {/* Header with user ID and points */}
      <div className="mood-header">
        <span className="user-id">#{state.oderId}</span>
        <span className="points-display">{state.points} pts</span>
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
          Spend points instead!
        </button>

        <button className="btn-confess" onClick={onConfess}>
          Ah, I did something stupid...
        </button>
      </div>
    </div>
  )
}
