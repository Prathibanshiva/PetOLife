import { createContext, useContext, useState, useEffect } from 'react'
import { getUser, getToken, clearAuth, setAuth } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser())
  const [token, setToken] = useState(() => getToken())

  function login(tokenValue, userData) {
    setAuth(tokenValue, userData)
    setToken(tokenValue)
    setUser(userData)
  }

  function logout() {
    clearAuth()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
