import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Statistics from './pages/Statistics'
import CreateQuiz from './pages/CreateQuiz'
import TakeQuiz from './pages/TakeQuiz'
import QuizResults from './pages/QuizResults'
import QuizView from './pages/QuizView';
import QuizSubmissions from './pages/QuizSubmissions';
import PrivateRoute from './components/PrivateRoute'
import NotFound from './pages/NotFound'
import RouterFallback from './RouterFallback'
import TestQuizAccess from './pages/TestQuizAccess'
import TestQuizShare from './pages/TestQuizShare'

function App() {
  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#06545E',
            },
          },
        }}
      />
      {/* This component handles redirects from 404.html */}
      <RouterFallback />
      <Routes>
        {/* PUBLIC ROUTES - Keep these first to ensure they don't get caught by auth checks */}
        {/* TakeQuiz does NOT need authentication - learners should access directly */}
        <Route path="/quiz/:accessCode" element={<TakeQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* PROTECTED ROUTES - require authentication */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
        <Route path="/create-quiz" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
        <Route path="/quiz/:accessCode/view" element={<PrivateRoute><QuizView /></PrivateRoute>} />
        <Route path="/quiz/:accessCode/results" element={<PrivateRoute><QuizResults /></PrivateRoute>} />
        <Route path="/quiz/:id/submissions" element={<PrivateRoute><QuizSubmissions /></PrivateRoute>} />
        
        {/* Test routes for public quiz access */}
        <Route path="/test-quiz-access" element={<TestQuizAccess />} />
        <Route path="/test-quiz-share" element={<TestQuizShare />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App