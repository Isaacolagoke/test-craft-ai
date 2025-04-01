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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
        <Route path="/create-quiz" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
        <Route path="/quiz/:accessCode/view" element={<PrivateRoute><QuizView /></PrivateRoute>} />
        <Route path="/quiz/:accessCode" element={<TakeQuiz />} />
        <Route path="/quiz/:accessCode/results" element={<PrivateRoute><QuizResults /></PrivateRoute>} />
        <Route path="/quiz/:id/submissions" element={<PrivateRoute><QuizSubmissions /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App