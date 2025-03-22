import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoText from '../assets/logo-text.svg'
import googleIcon from '../assets/google.svg'
import { toast } from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    setError('')
    setIsLoading(true)

    try {
      const result = await login(formData)
      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pt-8">
      {/* Logo fixed at top */}
      <div className="w-full flex justify-center fixed top-8 z-10">
        <img src={logoText} alt="TestCraft.ai" className="h-6" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-[700px] mx-auto px-4 sm:px-6 md:px-container-padding">
          <div className="flex flex-col items-center mt-16">
            {/* Heading */}
            <h1 className="text-[36px] font-semibold text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-slate-600 font-normal text-paragraph mb-8">
              Log in to your TestCraft account
            </p>

            {/* Error message */}
            {error && (
              <div className="w-full max-w-[400px] mb-4 p-4 text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-[400px] space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-14 px-6 rounded-full border border-slate-400 focus:border-[#06545E] focus:outline-none focus:ring-2 focus:ring-[#06545E]/20 transition-colors text-body"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-14 px-6 pr-12 rounded-full border border-slate-400 focus:border-[#06545E] focus:outline-none focus:ring-2 focus:ring-[#06545E]/20 transition-colors text-body"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="submit"
                className="w-full h-14 bg-[#06545E] text-[#FFFFFF] rounded-full font-medium transition-colors hover:bg-[#06545E]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            {/* Sign up link */}
            <p className="mt-6 text-body text-secondary-gray">
              Don't have a TestCraft account?{' '}
              <Link to="/register" className="text-[#06545E] font-medium hover:opacity-90">
                Sign up
              </Link>
            </p>

            {/* Divider */}
            <div className="w-full max-w-[400px] flex items-center my-6">
              <div className="flex-1 border-t border-slate-400"></div>
              <span className="px-4 text-body text-secondary-gray">or</span>
              <div className="flex-1 border-t border-slate-400"></div>
            </div>

            {/* Google button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                toast.error('Google login will be implemented soon!')
              }}
              className="w-full max-w-[400px] h-14 flex items-center justify-center gap-2 border border-slate-400 rounded-full hover:bg-slate-50 transition-colors text-body text-secondary"
              disabled={isLoading}
            >
              <img src={googleIcon} alt="" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}