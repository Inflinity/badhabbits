import { useEffect, useState } from 'react'
import './ResultOverlay.css'

interface ResultOverlayProps {
  type: 'success' | 'fail'
  onComplete: () => void
}

export default function ResultOverlay({ type, onComplete }: ResultOverlayProps) {
  const [phase, setPhase] = useState<'show' | 'fly' | 'done'>('show')

  useEffect(() => {
    // Show overlay for 2 seconds, then animate point flying
    const showTimer = setTimeout(() => {
      if (type === 'success') {
        setPhase('fly')
        // Wait for fly animation, then complete
        setTimeout(() => {
          setPhase('done')
          onComplete()
        }, 800)
      } else {
        setPhase('done')
        onComplete()
      }
    }, 2000)

    return () => clearTimeout(showTimer)
  }, [type, onComplete])

  if (phase === 'done') return null

  return (
    <div className={`result-overlay ${type}`}>
      {/* Confetti/particles for success */}
      {type === 'success' && (
        <div className="confetti-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#6B7F56', '#7FA3B0', '#EDE8E2', '#C9D1C8'][Math.floor(Math.random() * 4)]
              }}
            />
          ))}
        </div>
      )}

      <div className="result-content">
        <img
          src={type === 'success' ? '/graphics/success_512x512.png' : '/graphics/fail_512x512.png'}
          alt={type === 'success' ? 'Success!' : 'Failed'}
          className="result-image"
        />

        {type === 'success' ? (
          <>
            <p className="result-title">very good!</p>
            <div className={`result-points ${phase === 'fly' ? 'flying' : ''}`}>
              +1 point earned
            </div>
          </>
        ) : (
          <>
            <p className="result-title">fail!</p>
            <p className="result-subtitle">shame! you missed the opportunity</p>
            <div className="result-points negative">-1 point</div>
          </>
        )}
      </div>
    </div>
  )
}
