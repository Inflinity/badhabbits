import { AppState, REWARD_CATEGORIES } from '../lib/state'
import './ConfessScreen.css'

interface ConfessScreenProps {
  state: AppState
  onConfess: (categoryId: string) => void
  onBack: () => void
}

export default function ConfessScreen({ state, onConfess, onBack }: ConfessScreenProps) {
  return (
    <div className="confess-screen">
      <div className="confess-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>

      <div className="confess-content">
        <h1 className="confess-title">Oops...</h1>
        <p className="confess-subtitle">What did you do?</p>

        <div className="confess-grid">
          {REWARD_CATEGORIES.map(category => (
            <button
              key={category.id}
              className="confess-card"
              onClick={() => onConfess(category.id)}
            >
              <span className="confess-icon">{category.icon}</span>
              <span className="confess-name">{category.name}</span>
            </button>
          ))}
        </div>

        <p className="confess-info">
          Confessing costs you <strong>1 point</strong> as a penalty.
          <br />
          But honesty is the first step!
        </p>
      </div>
    </div>
  )
}
