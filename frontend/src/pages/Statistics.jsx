import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { toast } from 'react-hot-toast'
import { getApiUrl } from '../utils/apiUrl'

export default function Statistics() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [stats, setStats] = React.useState(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(getApiUrl('/api/statistics'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch statistics')
      }

      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError(err.message)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchStats()
  }, [])

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
          Quiz Statistics
        </h2>
        <p className="text-slate-600 text-sm mt-1">
          View detailed statistics about your quizzes and learner engagement
        </p>
      </div>

      {loading ? (
        <div className="w-full text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06545E]"></div>
          <p className="mt-4 text-slate-600">Loading statistics...</p>
        </div>
      ) : error ? (
        <div className="w-full text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 text-[#06545E] hover:text-[#06545E]/80"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Total Quizzes</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.total || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Published Quizzes</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.published || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Quizzes with Responses</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.withResponses || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Total Responses</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.totalResponses || 0}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:col-span-2">
            <h3 className="text-sm font-medium text-slate-600">Average Score</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.averageScore || 0}%
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:col-span-2">
            <h3 className="text-sm font-medium text-slate-600">Completion Rate</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stats.completionRate || 0}%
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 