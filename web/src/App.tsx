import { useState } from 'react'
import { Desk } from './components/Desk'
import { Landing } from './components/Landing'

export default function App() {
  const [view, setView] = useState<'landing' | 'desk'>('landing')

  if (view === 'desk') {
    return <Desk onBack={() => setView('landing')} />
  }

  return <Landing onOpenDesk={() => setView('desk')} />
}
