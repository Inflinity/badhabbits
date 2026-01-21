import { useState } from 'react'
import './WelcomeScreen.css'

interface WelcomeScreenProps {
  onComplete: () => void
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0)

  return (
    <div className="welcome-screen">
      {step === 0 && (
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome...</h1>
          <p className="welcome-subtitle">to the last day of your old life.</p>

          <div className="welcome-text">
            <p>
              Tomorrow morning — whatever you do...
              <br />
              <strong>your bad habits go through me.</strong>
            </p>

            <p className="welcome-highlight">
              You wanna drink, eat pizza, shop online,
              play video games, check social media?
            </p>

            <p className="welcome-bold">
              You gotta earn it.
            </p>

            <p className="welcome-rules">
              You get points. You spend points.
              <br />
              <span className="accent">No more untracked stuff.</span>
            </p>

            <p className="welcome-cta">Get on it.</p>
          </div>

          <button className="welcome-button" onClick={() => setStep(1)}>
            Uh oh
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="welcome-content">
          <h1 className="welcome-title-small">Stop wasting time.</h1>

          <div className="first-task">
            <p className="task-label">Your first task:</p>
            <div className="task-card">
              <p className="task-text">
                Go for a 20 minute walk, don't look at your phone
              </p>
              <div className="task-timer">
                ⏱️ 1 hour to complete
              </div>
            </div>

            <div className="reward-preview">
              <p className="reward-label">Reward:</p>
              <div className="reward-item">
                <span className="reward-emoji">🍕</span>
                <span className="reward-text">One piece of junkfood</span>
              </div>
            </div>
          </div>

          <div className="rewards-list">
            <p className="rewards-title">What you can earn:</p>
            <div className="rewards-grid">
              <div className="reward-badge">🍕 Junkfood</div>
              <div className="reward-badge">🛒 Shopping budget</div>
              <div className="reward-badge">🍺 Drink</div>
              <div className="reward-badge">📱 Social media time</div>
              <div className="reward-badge">🎮 Gaming time</div>
            </div>
          </div>

          <button className="welcome-button start" onClick={onComplete}>
            Let's go
          </button>
        </div>
      )}
    </div>
  )
}
