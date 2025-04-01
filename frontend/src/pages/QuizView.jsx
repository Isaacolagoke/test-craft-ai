import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { getApiUrl, getImageUrl } from '../utils/apiUrl';

const QuizView = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching quiz with access code:', accessCode);
        
        const response = await fetch(getApiUrl(`/api/quizzes/access/${accessCode}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz');
        }
        
        console.log('Quiz data:', data);
        setQuiz(data.quiz);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        toast.error('Failed to load quiz');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [accessCode, navigate]);

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
                    {question.options.map((option, optIndex) => {
                      // Handle different types of options based on their structure
                      if (typeof option === 'object') {
                        // Matching type question (left-right)
                        if (option.left !== undefined && option.right !== undefined) {
                          return (
                            <div key={optIndex} className="flex items-center text-gray-600">
                              <span className="w-6">{String.fromCharCode(65 + optIndex)}.</span>
                              <span className="flex-1">
                                <span className="font-medium">{option.left}</span>
                                <span className="mx-2">→</span>
                                <span>{option.right}</span>
                              </span>
                            </div>
                          );
                        }
                        // True/False or similar with text and isCorrect
                        else if (option.text !== undefined) {
                          const isCorrect = option.isCorrect === true || 
                                           (question.correct_answer && 
                                            (option.text === question.correct_answer || 
                                             JSON.stringify(option) === JSON.stringify(question.correct_answer)));
                          
                          return (
                            <div key={optIndex} className={`flex items-center ${
                              isCorrect ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              <span className="w-6">{String.fromCharCode(65 + optIndex)}.</span>
                              <span>{option.text}</span>
                              {isCorrect && (
                                <span className="ml-2 text-xs font-medium">(Correct Answer)</span>
                              )}
                            </div>
                          );
                        }
                        // Other object types - display as JSON string as fallback
                        else {
                          return (
                            <div key={optIndex} className="flex items-center text-gray-600">
                              <span className="w-6">{String.fromCharCode(65 + optIndex)}.</span>
                              <span>{JSON.stringify(option)}</span>
                            </div>
                          );
                        }
                      }
                      // Handle primitive option values (string, number, etc.)
                      else {
                        const isCorrect = option === question.correct_answer;
                        return (
                          <div key={optIndex} className={`flex items-center ${
                            isCorrect ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            <span className="w-6">{String.fromCharCode(65 + optIndex)}.</span>
                            <span>{option}</span>
                            {isCorrect && (
                              <span className="ml-2 text-xs font-medium">(Correct Answer)</span>
                            )}
                          </div>
                        );
                      }
                    })}
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
                onClick={() => navigate(`/quiz/${accessCode}`)}
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
