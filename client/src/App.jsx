import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Registration from './Registration'
import './App.css'
import background from './background.jpg'
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from 'react-router-dom'

function App() {
  
  return (

    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
    
   )
}

export default App
