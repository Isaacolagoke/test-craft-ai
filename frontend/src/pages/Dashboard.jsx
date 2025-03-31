import React from 'react'
import { Tab } from '@headlessui/react'
import DashboardLayout from '../components/DashboardLayout'
import QuizCard from '../components/QuizCard'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon 
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../hooks/useQuiz'
import { useAuth } from '../context/AuthContext'
import CreateQuizModal from '../components/CreateQuizModal'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [layoutType, setLayoutType] = React.useState('grid') // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)

  const {
    quizzes,
    loading,
    error,
    refreshQuizzes
  } = useQuiz()

  // Filter quizzes based on search query
  const filteredQuizzes = React.useMemo(() => {
    if (!quizzes) return [];
    if (!searchQuery) return quizzes;
    
    const query = searchQuery.toLowerCase();
    return quizzes.filter(quiz => 
      quiz.title.toLowerCase().includes(query) ||
      quiz.description?.toLowerCase().includes(query)
    );
  }, [quizzes, searchQuery]);

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  return (
    <DashboardLayout>
      {/* Header section with title and create button */}
      <div className="px-4 sm:px-6 md:px-container-padding flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome to TestCraft.ai
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Create and manage your quizzes with AI assistance
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-4 bg-[#06545E] text-white rounded-full font-medium transition-colors hover:bg-[#06545E]/90 shadow-sm flex items-center gap-2 text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Create New Quiz
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tab.Group>
          <Tab.List className="flex space-x-4 border-b border-slate-200">
            <Tab className={({ selected }) =>
              `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${selected 
                ? 'text-[#06545E] border-[#06545E]' 
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`
            }>
              All Content
            </Tab>
            <Tab className={({ selected }) =>
              `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${selected 
                ? 'text-[#06545E] border-[#06545E]' 
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`
            }>
              Quiz
            </Tab>
            <Tab disabled className="px-4 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent whitespace-nowrap cursor-not-allowed">
              Assignment (Coming Soon)
            </Tab>
            <Tab disabled className="px-4 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent whitespace-nowrap cursor-not-allowed">
              Course (Coming Soon)
            </Tab>
          </Tab.List>

          <Tab.Panels className="mt-6 px-4 sm:px-6 md:px-container-padding">
            <Tab.Panel>
              {/* Search and layout controls */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 focus:border-[#06545E] focus:outline-none focus:ring-2 focus:ring-[#06545E]/20 transition-colors text-sm"
                  />
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-2 ">
                  <button
                    onClick={() => setLayoutType('grid')}
                    className={`p-2 rounded ${
                      layoutType === 'grid'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setLayoutType('list')}
                    className={`p-2 rounded ${
                      layoutType === 'list'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06545E] mx-auto"></div>
                  <p className="mt-4 text-slate-600">Loading quizzes...</p>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={refreshQuizzes}
                    className="mt-4 px-4 py-2 text-[#06545E] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && filteredQuizzes.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    No quizzes yet
                  </h2>
                  <p className="text-slate-600 text-paragraph mb-6">
                    Get started by creating your first quiz with AI assistance
                  </p>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-10 px-4 bg-[#06545E] text-white rounded-full font-medium transition-colors hover:bg-[#06545E]/90 flex items-center gap-2 text-sm mx-auto"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Your First Quiz
                  </button>
                </div>
              )}

              {/* Grid view */}
              {!loading && !error && filteredQuizzes.length > 0 && layoutType === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredQuizzes.map((quiz) => (
                    <QuizCard 
                      key={quiz.id} 
                      quiz={quiz} 
                      onStatusChange={refreshQuizzes}
                    />
                  ))}
                </div>
              )}

              {/* List view */}
              {!loading && !error && filteredQuizzes.length > 0 && layoutType === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-200 shadow-sm">
                  {filteredQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <QuizCard 
                        quiz={quiz} 
                        onStatusChange={refreshQuizzes}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Tab.Panel>

            <Tab.Panel>
              {/* Quiz tab content - same as All Content for now */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search quizzes..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 focus:border-[#06545E] focus:outline-none focus:ring-2 focus:ring-[#06545E]/20 transition-colors text-sm"
                  />
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1">
                  <button
                    onClick={() => setLayoutType('grid')}
                    className={`p-2 rounded ${
                      layoutType === 'grid'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setLayoutType('list')}
                    className={`p-2 rounded ${
                      layoutType === 'list'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Empty state for no quizzes */}
              {!loading && !error && filteredQuizzes.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    No quizzes yet
                  </h2>
                  <p className="text-slate-600 text-paragraph mb-6">
                    Get started by creating your first quiz with AI assistance
                  </p>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-10 px-4 bg-[#06545E] text-white rounded-full font-medium transition-colors hover:bg-[#06545E]/90 flex items-center gap-2 text-sm mx-auto"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Your First Quiz
                  </button>
                </div>
              )}

              {/* Grid view */}
              {!loading && !error && filteredQuizzes.length > 0 && layoutType === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredQuizzes.map((quiz) => (
                    <QuizCard 
                      key={quiz.id} 
                      quiz={quiz} 
                      onStatusChange={refreshQuizzes}
                    />
                  ))}
                </div>
              )}

              {/* List view */}
              {!loading && !error && filteredQuizzes.length > 0 && layoutType === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-200 shadow-sm">
                  {filteredQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <QuizCard 
                        quiz={quiz} 
                        onStatusChange={refreshQuizzes}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Tab.Panel>

            <Tab.Panel>
              {/* Assignment tab content - coming soon */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Coming Soon
                </h2>
                <p className="text-slate-600 text-paragraph">
                  Assignment feature will be available soon
                </p>
              </div>
            </Tab.Panel>

            <Tab.Panel>
              {/* Course tab content - coming soon */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Coming Soon
                </h2>
                <p className="text-slate-600 text-paragraph">
                  Course feature will be available soon
                </p>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Create Quiz Modal */}
      <CreateQuizModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </DashboardLayout>
  )
}