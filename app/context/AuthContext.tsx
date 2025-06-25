// File: app/context/AuthContext.tsx

'use client'

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react'

interface AuthContextType {
  userEmail: string | null
  setUserEmail: (email: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmailState] = useState<string | null>(null)

  // on mount, initialize from localStorage
  useEffect(() => {
	const saved = localStorage.getItem('userEmail')
	if (saved) setUserEmailState(saved)
  }, [])

  const setUserEmail = (email: string | null) => {
	if (email) {
	  localStorage.setItem('userEmail', email)
	} else {
	  localStorage.removeItem('userEmail')
	}
	setUserEmailState(email)
  }

  return (
	<AuthContext.Provider value={{ userEmail, setUserEmail }}>
	  {children}
	</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
	throw new Error('useAuth must be inside AuthProvider')
  }
  return ctx
}
