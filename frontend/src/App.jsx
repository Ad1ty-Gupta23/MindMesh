

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Register from './pages/register'
import Home from './pages/home'
import HabitBlockchainProvider from './context/HabitBlockchainContext'
import EyeDetectionTimer from './components/EyeMonitor'
import Dashboard from './pages/dashboard'
import AIMentalWellnessApp from './pages/Aiwellness'
import GamesHub from './pages/Games'
import CosmicDefender from './components/CosmicDefender'
import Game from './pages/game1'
import FocusTracker from './components/Focus'
import MeditationHome from './pages/MediHome'
// import HealthSyncDashboard from './pages/fitbit'
import Aimirror from './pages/Aimiiror'

import MoodTimelineApp from './pages/mood'
import WellnessLeaderboard from './pages/leaderboard'
// import FocusProductivityTracker from './pages/tracker'
function App() {
 

  return (
    <HabitBlockchainProvider>
   
    <BrowserRouter>
      <Routes>
         <Route path="/login" element={<Login />}></Route>
        <Route path="/register" element={<Register />}></Route>
        <Route path="/" element={<Home />}></Route>
        <Route path="/meditate" element={<EyeDetectionTimer />}></Route>
        <Route path="/usedash" element={<Dashboard/>}></Route>
        <Route path="/wellness" element={<AIMentalWellnessApp/>}></Route>
        <Route path="/games" element={<GamesHub />}></Route>
         <Route path="/cosmic" element={<CosmicDefender />}></Route>
         <Route path="/fruit" element={<Game />}></Route>
         <Route path="/focus" element={<FocusTracker />}></Route>
         <Route path="/medihome" element={<MeditationHome />} />
        <Route path="/meditate" element={<EyeDetectionTimer />}></Route>
        <Route path="/usedash" element={<Dashboard/>}></Route>
        <Route path="/wellness" element={<AIMentalWellnessApp/>}></Route>
        <Route path="/games" element={<GamesHub />}></Route>
         <Route path="/cosmic" element={<CosmicDefender />}></Route>
         <Route path="/fruit" element={<Game />}></Route>
         <Route path="/focus" element={<FocusTracker />}></Route>
         <Route path="/medihome" element={<MeditationHome />} />
         <Route path="/focus" element={<FocusTracker />}></Route>
         <Route path="/medihome" element={<MeditationHome />} />
         {/* <Route path="/fit" element={<HealthSyncDashboard/>}></Route> */}
        <Route path="/mirror" element={<Aimirror/>}></Route> 
        <Route path="/mood" element={<MoodTimelineApp/>}></Route>
         <Route path="/leader" element={<WellnessLeaderboard/>}></Route>
        </Routes>
    </BrowserRouter>
    </HabitBlockchainProvider>
  )
}

export default App
