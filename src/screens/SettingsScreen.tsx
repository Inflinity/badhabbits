import { useState } from 'react'
import { AppState } from '../lib/state'
import './SettingsScreen.css'

interface SettingsScreenProps {
  state: AppState
  onReset: () => void
  onBack: () => void
}

export default function SettingsScreen({ state, onReset, onBack }: SettingsScreenProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleReset = () => {
    if (showConfirm) {
      onReset()
    } else {
      setShowConfirm(true)
    }
  }

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>

      <div className="settings-content">
        <h1 className="settings-title">Settings</h1>

        <div className="settings-section">
          <div className="settings-info">
            <p className="info-label">Your ID</p>
            <p className="info-value">#{state.oderId}</p>
          </div>

          <div className="settings-info">
            <p className="info-label">Total Points Earned</p>
            <p className="info-value">{state.completedTasks} tasks completed</p>
          </div>

          <div className="settings-info">
            <p className="info-label">Current Points</p>
            <p className="info-value">{state.points} pts</p>
          </div>

          <div className="settings-info">
            <p className="info-label">Schweinehund Level</p>
            <p className="info-value">Level {state.schweinehund.level}</p>
          </div>
        </div>

        <div className="settings-danger">
          <h2 className="danger-title">Danger Zone</h2>

          {!showConfirm ? (
            <button className="reset-btn" onClick={handleReset}>
              Reset Everything
            </button>
          ) : (
            <div className="confirm-reset">
              <p className="confirm-text">Are you sure? This will delete all your progress!</p>
              <div className="confirm-buttons">
                <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button className="confirm-delete" onClick={handleReset}>
                  Yes, Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
