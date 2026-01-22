import { useState, useEffect, useCallback } from 'react'
import MoodScreen from './screens/MoodScreen'
import ActiveTaskScreen from './screens/ActiveTaskScreen'
import SettingsScreen from './screens/SettingsScreen'
import ResultOverlay from './components/ResultOverlay'
import { loadState, saveState, clearState, AppState, getInitialState, getRandomTask } from './lib/state'

type Screen = 'main' | 'active' | 'spend' | 'invest' | 'track' | 'messages' | 'settings' | 'profile'
type ResultType = 'success' | 'fail' | null

function App() {
  const [screen, setScreen] = useState<Screen>('main')
  const [state, setState] = useState<AppState>(getInitialState)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showResult, setShowResult] = useState<ResultType>(null)

  // Load saved state on mount
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setState(saved)
    }
    setIsLoaded(true)
  }, [])

  // Save state on changes
  useEffect(() => {
    if (isLoaded) {
      saveState(state)
    }
  }, [state, isLoaded])

  const handleReset = () => {
    clearState()
    setState(getInitialState())
    setScreen('main')
  }

  const handleMoodSelect = (moodId: string) => {
    const task = getRandomTask(moodId)
    if (task) {
      setState(prev => ({
        ...prev,
        selectedMood: moodId,
        currentTask: {
          task,
          startedAt: Date.now(),
        }
      }))
      setScreen('active')
    }
  }

  const handleTaskComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      points: prev.points + 1,
      completedTasks: prev.completedTasks + 1,
      currentTask: null,
    }))
    setShowResult('success')
  }, [])

  const handleResultComplete = useCallback(() => {
    setShowResult(null)
    setScreen('main')
  }, [])

  // Task expired - lost a point!
  const handleTaskExpired = useCallback(() => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - 1),
      currentTask: null,
    }))
    setShowResult('fail')
  }, [])

  // Go back to main screen while keeping task running
  const handleBackToMain = () => {
    setScreen('main')
  }

  // Resume active task
  const handleResumeTask = () => {
    if (state.currentTask) {
      setScreen('active')
    }
  }

  if (!isLoaded) {
    return <div style={{ background: 'var(--bg)', height: '100%' }} />
  }

  return (
    <>
      {/* Result Overlay - shows on top of everything */}
      {showResult && (
        <ResultOverlay type={showResult} onComplete={handleResultComplete} />
      )}

      {screen === 'main' && (
        <MoodScreen
          state={state}
          activeTask={state.currentTask}
          onMoodSelect={handleMoodSelect}
          onSpendCoins={() => setScreen('spend')}
          onInvestCoins={() => setScreen('invest')}
          onTrackRecord={() => setScreen('track')}
          onSettings={() => setScreen('settings')}
          onResumeTask={handleResumeTask}
          onMessages={() => setScreen('messages')}
          onProfile={() => setScreen('profile')}
        />
      )}
      {screen === 'active' && state.currentTask && (
        <ActiveTaskScreen
          task={state.currentTask}
          onComplete={handleTaskComplete}
          onExpired={handleTaskExpired}
          onBack={handleBackToMain}
        />
      )}
      {screen === 'spend' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>back</button>
          <h2>spend coins (bad!)</h2>
          <p>coming soon...</p>
        </div>
      )}
      {screen === 'invest' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>back</button>
          <h2>invest coins (good!)</h2>
          <p>coming soon...</p>
        </div>
      )}
      {screen === 'track' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>back</button>
          <h2>track record</h2>
          <img src="/graphics/trackrecord_512x512.png" alt="Track Record" style={{ width: 150, marginTop: 20 }} />
          <p>coming soon...</p>
        </div>
      )}
      {screen === 'messages' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>back</button>
          <h2>messages</h2>
          <p>no new messages</p>
          <p style={{ fontSize: 12, color: '#5C4D42', marginTop: 20 }}>challenges and invitations from other players will appear here</p>
        </div>
      )}
      {screen === 'profile' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>back</button>
          <h2>profile / custom menu</h2>
          <img src="/graphics/defaultavatar_512x512.png" alt="Avatar" style={{ width: 120, marginTop: 20, borderRadius: '50%' }} />
          <p style={{ marginTop: 20 }}>User ID: {state.oderId}</p>
          <p style={{ fontSize: 12, color: '#5C4D42', marginTop: 20 }}>customize your avatar and settings here</p>
          <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 10 }}>⚠️ profile incomplete - add your info!</p>
        </div>
      )}
      {screen === 'settings' && (
        <SettingsScreen
          state={state}
          onReset={handleReset}
          onBack={() => setScreen('main')}
        />
      )}
    </>
  )
}

export default App
