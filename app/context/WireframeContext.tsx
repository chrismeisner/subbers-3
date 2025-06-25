// File: app/context/WireframeContext.tsx

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'

interface WireframeContextType {
  wireframeMode: boolean
  toggleWireframe: () => void
}

const WireframeContext = createContext<WireframeContextType | undefined>(undefined)

export function WireframeProvider({ children }: { children: ReactNode }) {
  const [wireframeMode, setWireframeMode] = useState(false)

  const toggleWireframe = () => {
	setWireframeMode(prev => !prev)
  }

  useEffect(() => {
	const className = 'wireframe-mode'
	const root = document.documentElement
	if (wireframeMode) {
	  root.classList.add(className)
	} else {
	  root.classList.remove(className)
	}
  }, [wireframeMode])

  return (
	<WireframeContext.Provider value={{ wireframeMode, toggleWireframe }}>
	  {children}
	</WireframeContext.Provider>
  )
}

export function useWireframe() {
  const context = useContext(WireframeContext)
  if (!context) {
	throw new Error('useWireframe must be used within a WireframeProvider')
  }
  return context
}
