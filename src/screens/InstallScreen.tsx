import './InstallScreen.css'

interface InstallScreenProps {
  onContinue: () => void
}

export default function InstallScreen({ onContinue }: InstallScreenProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true

  // If already installed as PWA, skip this screen
  if (isStandalone) {
    onContinue()
    return null
  }

  return (
    <div className="install-screen">
      <div className="install-logo">
        <img src="/logo/bad_habbit_logo_512x512_transparent.png" alt="Bad Habbit" />
      </div>

      <h1 className="install-title">Add to Home Screen</h1>
      <p className="install-subtitle">For the best experience, install Bad Habbit on your phone.</p>

      {isIOS && (
        <div className="install-steps">
          <div className="install-step">
            <span className="step-number">1</span>
            <span>Tap the <strong>Share</strong> button below</span>
            <span className="step-icon">↑</span>
          </div>
          <div className="install-step">
            <span className="step-number">2</span>
            <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
          </div>
          <div className="install-step">
            <span className="step-number">3</span>
            <span>Tap <strong>"Add"</strong> in the top right</span>
          </div>
        </div>
      )}

      {isAndroid && (
        <div className="install-steps">
          <div className="install-step">
            <span className="step-number">1</span>
            <span>Tap the <strong>menu</strong> (three dots) in your browser</span>
          </div>
          <div className="install-step">
            <span className="step-number">2</span>
            <span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
          </div>
          <div className="install-step">
            <span className="step-number">3</span>
            <span>Tap <strong>"Add"</strong> to confirm</span>
          </div>
        </div>
      )}

      {!isIOS && !isAndroid && (
        <div className="install-steps">
          <p className="install-desktop">
            On desktop, you can bookmark this page or use your browser's "Install" option if available.
          </p>
        </div>
      )}

      <button className="install-skip" onClick={onContinue}>
        Continue in browser
      </button>
    </div>
  )
}
