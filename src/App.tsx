import { useState, useEffect } from 'react'
import MoodScreen from './screens/MoodScreen'
import ActiveTaskScreen from './screens/ActiveTaskScreen'
import SettingsScreen from './screens/SettingsScreen'
import { loadState, saveState, clearState, AppState, getInitialState, getRandomTask } from './lib/state'

type Screen = 'main' | 'active' | 'spend' | 'invest' | 'track' | 'settings'

function App() {
  const [screen, setScreen] = useState<Screen>('main')
  const [state, setState] = useState<AppState>(getInitialState)
  const [isLoaded, setIsLoaded] = useState(false)

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

  const handleTaskComplete = () => {
    setState(prev => ({
      ...prev,
      points: prev.points + 1,
      completedTasks: prev.completedTasks + 1,
      currentTask: null,
    }))
    setScreen('main')
  }

  // Task expired - lost a point!
  const handleTaskExpired = () => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - 1),
      currentTask: null,
    }))
    setScreen('main')
  }

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
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>Back</button>
          <h2>Spend Coins (bad!)</h2>
          <p>Coming soon...</p>
        </div>
      )}
      {screen === 'invest' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>Back</button>
          <h2>Invest Coins (good!)</h2>
          <p>Coming soon...</p>
        </div>
      )}
      {screen === 'track' && (
        <div className="placeholder-screen" style={{ padding: 20, background: 'var(--bg)', height: '100%' }}>
          <button onClick={() => setScreen('main')} style={{ marginBottom: 20 }}>Back</button>
          <h2>Track Record</h2>
          <p>Coming soon...</p>
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
