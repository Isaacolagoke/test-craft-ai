import React from 'react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-[700px] mx-auto px-4 sm:px-6 md:px-container-padding">
        {children}
      </div>
    </div>
  )
} 