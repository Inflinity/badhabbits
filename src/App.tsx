import { useState, useEffect } from 'react'
import InstallScreen from './screens/InstallScreen'
import WelcomeScreen from './screens/WelcomeScreen'
import MoodScreen from './screens/MoodScreen'
import ActiveTaskScreen from './screens/ActiveTaskScreen'
import RedeemScreen from './screens/RedeemScreen'
import SchweinehundScreen from './screens/SchweinehundScreen'
import ConfessScreen from './screens/ConfessScreen'
import SendPointsScreen from './screens/SendPointsScreen'
import SettingsScreen from './screens/SettingsScreen'
import { loadState, saveState, clearState, AppState, getInitialState, getRandomTask, REWARD_CATEGORIES, SCHWEINEHUND_ITEMS } from './lib/state'

type Screen = 'install' | 'welcome' | 'mood' | 'active' | 'redeem' | 'schweinehund' | 'confess' | 'sendpoints' | 'settings'

// Check if running as installed PWA
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
}

// Check if install prompt was already shown
function hasSeenInstallPrompt(): boolean {
  return localStorage.getItem('badhabits_install_seen') === 'true'
}

function setInstallPromptSeen(): void {
  localStorage.setItem('badhabits_install_seen', 'true')
}

function App() {
  const [screen, setScreen] = useState<Screen>('install')
  const [state, setState] = useState<AppState>(getInitialState)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved state on mount
  useEffect(() => {
    const saved = loadState()

    // Determine initial screen
    if (isStandalone() || hasSeenInstallPrompt()) {
      // Skip install screen
      if (saved) {
        setState(saved)
        if (saved.onboardingComplete) {
          setScreen(saved.currentTask ? 'active' : 'mood')
        } else {
          setScreen('welcome')
        }
      } else {
        setScreen('welcome')
      }
    } else {
      // Show install screen first time
      if (saved) {
        setState(saved)
      }
      setScreen('install')
    }

    setIsLoaded(true)
  }, [])

  // Save state on changes
  useEffect(() => {
    if (isLoaded) {
      saveState(state)
    }
  }, [state, isLoaded])

  const handleInstallContinue = () => {
    setInstallPromptSeen()
    if (state.onboardingComplete) {
      setScreen(state.currentTask ? 'active' : 'mood')
    } else {
      setScreen('welcome')
    }
  }

  const handleOnboardingComplete = () => {
    setState(prev => ({ ...prev, onboardingComplete: true }))
    setScreen('mood')
  }

  const handleReset = () => {
    clearState()
    localStorage.removeItem('badhabits_install_seen')
    setState(getInitialState())
    setScreen('welcome')
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
    setScreen('mood')
  }

  // Task expired - lost a point!
  const handleTaskExpired = () => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - 1),
      currentTask: null,
    }))
    setScreen('mood')
  }

  // Redeem for self
  const handleRedeemForSelf = (categoryId: string) => {
    const category = REWARD_CATEGORIES.find(c => c.id === categoryId)
    if (!category || state.points < category.cost) return

    setState(prev => ({
      ...prev,
      points: prev.points - category.cost,
      rewardBalances: {
        ...prev.rewardBalances,
        [categoryId]: (prev.rewardBalances[categoryId] || 0) + 1,
      },
    }))
  }

  // Redeem for pet (Schweinehund upgrade)
  const handleRedeemForPet = (itemId: string) => {
    const item = SCHWEINEHUND_ITEMS.find(i => i.id === itemId)
    if (!item || state.points < item.cost) return
    if (state.schweinehund.items.includes(itemId)) return

    setState(prev => ({
      ...prev,
      points: prev.points - item.cost,
      schweinehund: {
        ...prev.schweinehund,
        level: item.level,
        items: [...prev.schweinehund.items, itemId],
        totalPointsSpent: prev.schweinehund.totalPointsSpent + item.cost,
      },
    }))
  }

  // Confess a slip-up (costs 1 point as penalty)
  const handleConfess = (_categoryId: string) => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - 1), // Penalty: lose 1 point
    }))
    setScreen('mood')
  }

  // Send points to a friend (for now just deduct locally - would need backend for real transfer)
  const handleSendPoints = (_recipientId: string, amount: number) => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - amount),
    }))
  }

  if (!isLoaded) {
    return <div style={{ background: 'var(--bg)', height: '100%' }} />
  }

  return (
    <>
      {screen === 'install' && (
        <InstallScreen onContinue={handleInstallContinue} />
      )}
      {screen === 'welcome' && (
        <WelcomeScreen onComplete={handleOnboardingComplete} />
      )}
      {screen === 'mood' && (
        <MoodScreen
          state={state}
          onMoodSelect={handleMoodSelect}
          onRedeem={() => setScreen('redeem')}
          onSchweinehund={() => setScreen('schweinehund')}
          onConfess={() => setScreen('confess')}
          onSendPoints={() => setScreen('sendpoints')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'active' && state.currentTask && (
        <ActiveTaskScreen
          task={state.currentTask}
          onComplete={handleTaskComplete}
          onExpired={handleTaskExpired}
        />
      )}
      {screen === 'redeem' && (
        <RedeemScreen
          state={state}
          onRedeemForSelf={handleRedeemForSelf}
          onRedeemForPet={handleRedeemForPet}
          onBack={() => setScreen('mood')}
        />
      )}
      {screen === 'schweinehund' && (
        <SchweinehundScreen
          state={state}
          onFeed={handleRedeemForPet}
          onBack={() => setScreen('mood')}
        />
      )}
      {screen === 'confess' && (
        <ConfessScreen
          state={state}
          onConfess={handleConfess}
          onBack={() => setScreen('mood')}
        />
      )}
      {screen === 'sendpoints' && (
        <SendPointsScreen
          state={state}
          onSend={handleSendPoints}
          onBack={() => setScreen('mood')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          state={state}
          onReset={handleReset}
          onBack={() => setScreen('mood')}
        />
      )}
    </>
  )
}

export default App
