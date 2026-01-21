import { AppState, REWARD_CATEGORIES, SCHWEINEHUND_ITEMS } from '../lib/state'
import './RedeemScreen.css'

interface RedeemScreenProps {
  state: AppState
  onRedeemForSelf: (categoryId: string) => void
  onRedeemForPet: (itemId: string) => void
  onBack: () => void
}

export default function RedeemScreen({ state, onRedeemForSelf, onRedeemForPet, onBack }: RedeemScreenProps) {
  const nextItem = SCHWEINEHUND_ITEMS.find(item => !state.schweinehund.items.includes(item.id))

  return (
    <div className="redeem-screen">
      <div className="redeem-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="points-display">{state.points} pts</span>
      </div>

      <h1 className="redeem-title">Spend Points</h1>

      {/* Schweinehund Section */}
      <div className="schweinehund-section">
        <div className="pet-display">
          <img
            src={`/piggy/piggy_${String(state.schweinehund.level).padStart(2, '0')}.png`}
            alt="Schweinehund"
            className="pet-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/piggy/piggy_01.png'
            }}
          />
          <div className="pet-info">
            <span className="pet-level">Level {state.schweinehund.level}</span>
            <span className="pet-name">Your Schweinehund</span>
          </div>
        </div>

        {nextItem && (
          <button
            className={`upgrade-pet-btn ${state.points >= nextItem.cost ? 'can-afford' : ''}`}
            onClick={() => onRedeemForPet(nextItem.id)}
            disabled={state.points < nextItem.cost}
          >
            <span className="upgrade-text">Upgrade: {nextItem.name}</span>
            <span className="upgrade-cost">{nextItem.cost} pts</span>
          </button>
        )}
      </div>

      {/* Self Rewards Section */}
      <div className="self-rewards-section">
        <h2 className="section-title">Redeem for yourself:</h2>
        <div className="rewards-grid">
          {REWARD_CATEGORIES.map(category => {
            const balance = state.rewardBalances[category.id] || 0
            const canAfford = state.points >= category.cost

            return (
              <button
                key={category.id}
                className={`reward-card ${canAfford ? 'can-afford' : ''}`}
                onClick={() => onRedeemForSelf(category.id)}
                disabled={!canAfford}
              >
                <span className="reward-icon">{category.icon}</span>
                <span className="reward-name">{category.name}</span>
                <span className="reward-cost">{category.cost} pt</span>
                {balance > 0 && <span className="reward-balance">x{balance}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
