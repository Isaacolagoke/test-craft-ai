import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function TakeQuiz() {
  const { accessCode } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [responses, setResponses] = React.useState({})
  const [timeLeft, setTimeLeft] = React.useState(null)

  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const token = localStorage.getItem('token')
        const response = await fetch(`http://localhost:3001/api/quizzes/access/${accessCode}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz')
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch quiz')
        }

        setQuiz(data.quiz)
        // Set initial time based on quiz duration
        if (data.quiz.settings && data.quiz.settings.duration) {
          setTimeLeft(data.quiz.settings.duration * 60) // Convert minutes to seconds
        }
      } catch (err) {
        console.error('Error fetching quiz:', err)
        setError(err.message)
        toast.error('Failed to fetch quiz: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [accessCode])

  // Timer effect
  React.useEffect(() => {
    if (!timeLeft) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAnswer = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ responses })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz')
      }

      toast.success('Quiz submitted successfully!')
      navigate(`/quiz/${accessCode}/results`, { state: { results: data.results } })
    } catch (err) {
      console.error('Error submitting quiz:', err)
      toast.error('Failed to submit quiz: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06545E]"></div>
          <p className="mt-4 text-slate-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-[#06545E] hover:text-[#06545E]/80"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Quiz not found</p>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Quiz Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{quiz.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{quiz.description}</p>
            </div>
            {timeLeft !== null && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-500">Time Remaining</div>
                <div className="text-2xl font-bold text-gray-900">{formatTime(timeLeft)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Quiz Image */}
        {quiz.image_url && (
          <div className="mb-8">
            <img
              src={quiz.image_url}
              alt={quiz.title}
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.display = 'block';
                e.target.style.height = '12rem';
              }}
            />
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span>{Math.round((currentQuestionIndex + 1) / quiz.questions.length * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#06545E] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-6">{currentQuestion.content}</h2>

          {/* Answer Options */}
          <div className="space-y-4">
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={`block w-full p-4 rounded-lg border ${
                  responses[currentQuestionIndex] === index
                    ? 'border-[#06545E] bg-[#06545E]/5'
                    : 'border-gray-200 hover:border-gray-300'
                } cursor-pointer transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={index}
                    checked={responses[currentQuestionIndex] === index}
                    onChange={() => handleAnswer(currentQuestionIndex, index)}
                    className="w-4 h-4 text-[#06545E] border-gray-300 focus:ring-[#06545E]"
                  />
                  <span className={responses[currentQuestionIndex] === index ? 'font-medium' : ''}>
                    {option}
                  </span>
                </div>
              </label>
            ))}

            {currentQuestion.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((option, index) => (
                  <label
                    key={index}
                    className={`block p-4 rounded-lg border ${
                      responses[currentQuestionIndex] === index
                        ? 'border-[#06545E] bg-[#06545E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } cursor-pointer transition-colors text-center`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={index}
                      checked={responses[currentQuestionIndex] === index}
                      onChange={() => handleAnswer(currentQuestionIndex, index)}
                      className="sr-only"
                    />
                    <span className={responses[currentQuestionIndex] === index ? 'font-medium' : ''}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`px-4 py-2 rounded-md ${
              currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-[#06545E] hover:bg-gray-50 border border-[#06545E]'
            }`}
          >
            Previous
          </button>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#06545E] text-white rounded-md hover:bg-[#06545E]/90"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-[#06545E] text-white rounded-md hover:bg-[#06545E]/90"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}