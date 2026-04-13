import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Registration from './Registration'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Registration />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App