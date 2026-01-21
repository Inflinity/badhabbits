import { useState } from 'react'
import { AppState } from '../lib/state'
import './SendPointsScreen.css'

interface SendPointsScreenProps {
  state: AppState
  onSend: (recipientId: string, amount: number) => void
  onBack: () => void
}

export default function SendPointsScreen({ state, onSend, onBack }: SendPointsScreenProps) {
  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState(1)
  const [sent, setSent] = useState(false)

  const canSend = recipientId.length >= 6 && amount > 0 && amount <= state.points

  const handleSend = () => {
    if (canSend) {
      onSend(recipientId, amount)
      setSent(true)
      setTimeout(() => {
        onBack()
      }, 2000)
    }
  }

  if (sent) {
    return (
      <div className="send-screen sent">
        <div className="sent-content">
          <span className="sent-emoji">🎁</span>
          <h1 className="sent-title">Points Sent!</h1>
          <p className="sent-info">
            {amount} point{amount > 1 ? 's' : ''} sent to #{recipientId}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="send-screen">
      <div className="send-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="points-badge">{state.points} pts</span>
      </div>

      <div className="send-content">
        <h1 className="send-title">Send Points</h1>
        <p className="send-subtitle">Share your hard-earned points with a friend</p>

        <div className="send-form">
          <div className="form-group">
            <label className="form-label">Friend's ID</label>
            <div className="input-wrapper">
              <span className="input-prefix">#</span>
              <input
                type="text"
                className="form-input"
                placeholder="Enter their 6-digit ID"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="amount-selector">
              <button
                className="amount-btn"
                onClick={() => setAmount(Math.max(1, amount - 1))}
                disabled={amount <= 1}
              >
                -
              </button>
              <span className="amount-value">{amount}</span>
              <button
                className="amount-btn"
                onClick={() => setAmount(Math.min(state.points, amount + 1))}
                disabled={amount >= state.points}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          className={`send-btn ${canSend ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!canSend}
        >
          Send {amount} Point{amount > 1 ? 's' : ''}
        </button>

        <p className="send-note">
          Your ID is <strong>#{state.oderId}</strong><br />
          Share it with friends so they can send you points too!
        </p>
      </div>
    </div>
  )
}
