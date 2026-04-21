import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Registration from './pages/Registration'
import Login from './pages/Login'
import Group from './pages/group'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CreateGroup from './pages/CreateGroup'
import Home from './pages/Home'


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Registration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/group" element={<Group />} />
          <Route path="/create-group" element={<CreateGroup />} />
          <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App