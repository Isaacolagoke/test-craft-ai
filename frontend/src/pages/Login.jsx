import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import logoText from '../assets/logo-text.svg'
import googleIcon from '../assets/google.svg'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', formData)
      
      // Store the token and user data
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed')
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
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-14 px-6 rounded-full border border-slate-400 focus:border-[#06545E] focus:outline-none focus:ring-2 focus:ring-[#06545E]/20 transition-colors text-body"
                  required
                  disabled={isLoading}
                />
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