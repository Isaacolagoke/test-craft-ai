import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizzes } from '../api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';

const QuizView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await quizzes.getById(id);
        setQuiz(response.data);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        toast.error('Failed to load quiz');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Quiz not found</h2>
          <p className="mt-2 text-gray-600">The quiz you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Quiz Header */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">{quiz.title}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                quiz.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {quiz.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{quiz.description}</p>
          </div>

          {/* Quiz Details */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                <p className="mt-1 text-lg text-gray-900">{quiz.category || 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Questions</h3>
                <p className="mt-1 text-lg text-gray-900">{quiz.questions?.length || 0} Questions</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                <p className="mt-1 text-lg text-gray-900">
                  {quiz.settings?.duration ? `${quiz.settings.duration} minutes` : 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Difficulty</h3>
                <p className="mt-1 text-lg text-gray-900">
                  {quiz.settings?.complexity ? quiz.settings.complexity.charAt(0).toUpperCase() + quiz.settings.complexity.slice(1) : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="px-6 py-5 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Questions</h2>
            <div className="space-y-4">
              {quiz.questions?.map((question, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">
                    {index + 1}. {question.text}
                  </p>
                  <div className="mt-3 ml-4 space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className={`flex items-center ${
                        option === question.correct_answer ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        <span className="w-6">{String.fromCharCode(65 + optIndex)}.</span>
                        <span>{option}</span>
                        {option === question.correct_answer && (
                          <span className="ml-2 text-xs font-medium">(Correct Answer)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate(`/quiz/${quiz.access_code}`)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                Take Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuizView;
