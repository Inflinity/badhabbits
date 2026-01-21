import { AppState, SCHWEINEHUND_ITEMS } from '../lib/state'
import './SchweinehundScreen.css'

interface SchweinehundScreenProps {
  state: AppState
  onFeed: (itemId: string) => void
  onBack: () => void
}

export default function SchweinehundScreen({ state, onFeed, onBack }: SchweinehundScreenProps) {
  const nextItem = SCHWEINEHUND_ITEMS.find(item => !state.schweinehund.items.includes(item.id))

  return (
    <div className="schweinehund-screen">
      <div className="schweinehund-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="points-badge">{state.points} pts</span>
      </div>

      <div className="schweinehund-content">
        <h1 className="schweinehund-title">Your Schweinehund</h1>

        <div className="schweinehund-display">
          <div className="schweinehund-avatar">
            <span className="schweinehund-emoji">🐷</span>
            <div className="schweinehund-items">
              {state.schweinehund.items.includes('sneakers') && <span className="item-emoji">👟</span>}
              {state.schweinehund.items.includes('sunglasses') && <span className="item-emoji">🕶️</span>}
              {state.schweinehund.items.includes('phone') && <span className="item-emoji">📱</span>}
              {state.schweinehund.items.includes('chain') && <span className="item-emoji">⛓️</span>}
              {state.schweinehund.items.includes('car') && <span className="item-emoji">🏎️</span>}
              {state.schweinehund.items.includes('champagne') && <span className="item-emoji">🍾</span>}
              {state.schweinehund.items.includes('yacht') && <span className="item-emoji">🛥️</span>}
            </div>
          </div>
          <p className="schweinehund-level">Level {state.schweinehund.level}</p>
          <p className="schweinehund-subtitle">
            {state.schweinehund.level === 1 && "Just a little piggy..."}
            {state.schweinehund.level === 2 && "Getting stylish!"}
            {state.schweinehund.level === 3 && "Looking cool!"}
            {state.schweinehund.level === 4 && "Connected to the world!"}
            {state.schweinehund.level === 5 && "Bling bling!"}
            {state.schweinehund.level === 6 && "Living fast!"}
            {state.schweinehund.level === 7 && "Celebrating life!"}
            {state.schweinehund.level >= 8 && "The ultimate Schweinehund!"}
          </p>
        </div>

        {nextItem ? (
          <div className="next-upgrade">
            <h2 className="upgrade-title">Next Upgrade</h2>
            <div className="upgrade-card">
              <div className="upgrade-info">
                <span className="upgrade-name">{nextItem.name}</span>
                <span className="upgrade-cost">{nextItem.cost} pts</span>
              </div>
              <button
                className={`upgrade-btn ${state.points >= nextItem.cost ? 'available' : 'locked'}`}
                onClick={() => onFeed(nextItem.id)}
                disabled={state.points < nextItem.cost}
              >
                {state.points >= nextItem.cost ? 'Feed!' : 'Need more points'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-level">
            <h2>🏆 Max Level Reached!</h2>
            <p>Your Schweinehund is fully spoiled!</p>
          </div>
        )}

        <div className="schweinehund-stats">
          <p>Total points fed: {state.schweinehund.totalPointsSpent}</p>
        </div>
      </div>
    </div>
  )
}
