import { useState, useEffect } from 'react'
import WelcomeScreen from './screens/WelcomeScreen'
import MoodScreen from './screens/MoodScreen'
import ActiveTaskScreen from './screens/ActiveTaskScreen'
import RedeemScreen from './screens/RedeemScreen'
import ConfessScreen from './screens/ConfessScreen'
import { loadState, saveState, AppState, getInitialState, getRandomTask, REWARD_CATEGORIES, SCHWEINEHUND_ITEMS } from './lib/state'

type Screen = 'welcome' | 'mood' | 'active' | 'redeem' | 'confess'

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [state, setState] = useState<AppState>(getInitialState)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved state on mount
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setState(saved)
      if (saved.onboardingComplete) {
        if (saved.currentTask) {
          setScreen('active')
        } else {
          setScreen('mood')
        }
      }
    }
    setIsLoaded(true)
  }, [])

  // Save state on changes
  useEffect(() => {
    if (isLoaded) {
      saveState(state)
    }
  }, [state, isLoaded])

  const handleOnboardingComplete = () => {
    setState(prev => ({ ...prev, onboardingComplete: true }))
    setScreen('mood')
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

  const handleTaskCancel = () => {
    setState(prev => ({
      ...prev,
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
  const handleConfess = (categoryId: string) => {
    setState(prev => ({
      ...prev,
      points: Math.max(0, prev.points - 1), // Penalty: lose 1 point
    }))
    setScreen('mood')
  }

  if (!isLoaded) {
    return <div style={{ background: 'var(--bg)', height: '100%' }} />
  }

  return (
    <>
      {screen === 'welcome' && (
        <WelcomeScreen onComplete={handleOnboardingComplete} />
      )}
      {screen === 'mood' && (
        <MoodScreen
          state={state}
          onMoodSelect={handleMoodSelect}
          onRedeem={() => setScreen('redeem')}
          onConfess={() => setScreen('confess')}
        />
      )}
      {screen === 'active' && state.currentTask && (
        <ActiveTaskScreen
          task={state.currentTask}
          onComplete={handleTaskComplete}
          onCancel={handleTaskCancel}
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
      {screen === 'confess' && (
        <ConfessScreen
          state={state}
          onConfess={handleConfess}
          onBack={() => setScreen('mood')}
        />
      )}
    </>
  )
}

export default App
