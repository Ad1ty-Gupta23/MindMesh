
import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Register from './pages/register'
import Home from './pages/home'
import HabitBlockchainProvider from './context/HabitBlockchainContext'
function App() {
 

  return (
    <HabitBlockchainProvider>
   
    <BrowserRouter>
      <Routes>
         <Route path="/login" element={<Login />}></Route>
        <Route path="/register" element={<Register />}></Route>
        <Route path="/" element={<Home />}></Route>
        <Route path="/meditate" element={<EyeDetectionTimer />}></Route>
        </Routes>
    </BrowserRouter>
    </HabitBlockchainProvider>
  )
}

export default App
