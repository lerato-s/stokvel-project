import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Registration from './Registration'
import Login from './Login'
import './login.css'
import './App.css'
//import background from '/background.jpg'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
 


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Registration />} />
           <Route path="/Login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App