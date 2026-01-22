// Reward categories with icons
export interface RewardCategory {
  id: string
  name: string
  icon: string // path to icon or emoji
  cost: number
}

// Moods = Einfallstore für den Schweinehund
export interface Mood {
  id: string
  name: string
  image: string
}

export interface Task {
  id: string
  title: string
  duration: number // Timer in minutes
  moodIds: string[]
}

export interface ActiveTask {
  task: Task
  startedAt: number
  completedAt?: number
}

// Schweinehund levels and items
export interface SchweinehundState {
  level: number
  items: string[] // collected items like 'sneakers', 'sunglasses', etc.
  totalPointsSpent: number
}

export interface AppState {
  oderId: string // Anonymous user ID like "372424"
  onboardingComplete: boolean
  points: number
  rewardBalances: Record<string, number> // e.g. { 'pizza': 3, 'drink': 1 }
  currentTask: ActiveTask | null
  completedTasks: number
  streak: number
  lastActiveDate: string | null
  selectedMood: string | null
  schweinehund: SchweinehundState
}

export const MOODS: Mood[] = [
  { id: 'commute', name: 'Commuting', image: '/graphics/commute_512x512.png' },
  { id: 'couch', name: 'Couch Potato', image: '/graphics/couch_512x512.png' },
  { id: 'social', name: 'With Friends', image: '/graphics/party_512x512.png' },
  { id: 'bed', name: 'In Bed', image: '/graphics/bed_512x512.png' },
]

// Reward categories - in order of "badness"
export const REWARD_CATEGORIES: RewardCategory[] = [
  { id: 'pizza', name: 'Fastfood', icon: '🍕', cost: 1 },
  { id: 'sugar', name: 'Sugar', icon: '🥤', cost: 1 },
  { id: 'drink', name: 'Drink', icon: '🍺', cost: 2 },
  { id: 'shopping', name: 'Shopping', icon: '🛒', cost: 3 },
  { id: 'social', name: 'Social Media', icon: '📱', cost: 2 },
  { id: 'gaming', name: 'Gaming', icon: '🎮', cost: 2 },
]

// Schweinehund upgrade items
export const SCHWEINEHUND_ITEMS = [
  { id: 'sneakers', name: 'Sneakers', cost: 5, level: 2 },
  { id: 'sunglasses', name: 'Sunglasses', cost: 8, level: 3 },
  { id: 'phone', name: 'Phone', cost: 10, level: 4 },
  { id: 'chain', name: 'Gold Chain', cost: 15, level: 5 },
  { id: 'car', name: 'Sports Car', cost: 25, level: 6 },
  { id: 'champagne', name: 'Champagne', cost: 30, level: 7 },
  { id: 'yacht', name: 'Yacht', cost: 50, level: 8 },
]

// Tasks per Mood
export const TASKS_BY_MOOD: Record<string, Task[]> = {
  commute: [
    { id: 'c1', title: 'Memorize a short poem', duration: 15, moodIds: ['commute'] },
    { id: 'c2', title: 'Listen to a podcast episode mindfully', duration: 20, moodIds: ['commute'] },
    { id: 'c3', title: 'Practice deep breathing for 5 minutes', duration: 10, moodIds: ['commute'] },
    { id: 'c4', title: 'Count 100 things of one color outside', duration: 10, moodIds: ['commute'] },
    { id: 'c5', title: 'Plan your top 3 priorities for today', duration: 10, moodIds: ['commute'] },
  ],
  couch: [
    { id: 'h1', title: 'Go for a 20 minute walk without phone', duration: 30, moodIds: ['couch'] },
    { id: 'h2', title: 'Do 20 push-ups', duration: 15, moodIds: ['couch'] },
    { id: 'h3', title: 'Stretch for 10 minutes', duration: 15, moodIds: ['couch'] },
    { id: 'h4', title: 'Clean one room for 15 minutes', duration: 20, moodIds: ['couch'] },
    { id: 'h5', title: 'Call a friend or family member', duration: 20, moodIds: ['couch'] },
  ],
  social: [
    { id: 's1', title: 'Have a real conversation - no phones!', duration: 30, moodIds: ['social'] },
    { id: 's2', title: 'Teach someone something you know', duration: 20, moodIds: ['social'] },
    { id: 's3', title: 'Play a board game or cards', duration: 30, moodIds: ['social'] },
    { id: 's4', title: 'Go for a walk together', duration: 30, moodIds: ['social'] },
    { id: 's5', title: 'Cook something together', duration: 45, moodIds: ['social'] },
  ],
  bed: [
    { id: 'b1', title: 'Read a book for 20 minutes', duration: 25, moodIds: ['bed'] },
    { id: 'b2', title: 'Write in a journal for 10 minutes', duration: 15, moodIds: ['bed'] },
    { id: 'b3', title: 'Do a body scan meditation', duration: 15, moodIds: ['bed'] },
    { id: 'b4', title: 'Plan tomorrow in writing', duration: 10, moodIds: ['bed'] },
    { id: 'b5', title: 'Listen to calming music - no screen', duration: 15, moodIds: ['bed'] },
  ],
}

// Generate a random 6-digit user ID
function generateUserId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getInitialState(): AppState {
  return {
    oderId: generateUserId(),
    onboardingComplete: false,
    points: 0,
    rewardBalances: {},
    currentTask: null,
    completedTasks: 0,
    streak: 1,
    lastActiveDate: null,
    selectedMood: null,
    schweinehund: {
      level: 1,
      items: [],
      totalPointsSpent: 0,
    },
  }
}

const STORAGE_KEY = 'badhabits_state'

export function loadState(): AppState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      // Ensure oderId exists (migration for old states)
      if (!state.oderId) {
        state.oderId = generateUserId()
      }
      // Ensure schweinehund exists
      if (!state.schweinehund) {
        state.schweinehund = { level: 1, items: [], totalPointsSpent: 0 }
      }
      // Ensure rewardBalances exists
      if (!state.rewardBalances) {
        state.rewardBalances = {}
      }
      return state
    }
  } catch (e) {
    console.error('Failed to load state:', e)
  }
  return null
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state:', e)
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear state:', e)
  }
}

export function getRandomTask(moodId: string): Task | null {
  const tasks = TASKS_BY_MOOD[moodId]
  if (!tasks || tasks.length === 0) return null
  return tasks[Math.floor(Math.random() * tasks.length)]
}
