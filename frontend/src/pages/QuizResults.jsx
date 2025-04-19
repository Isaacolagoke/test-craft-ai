import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { getApiUrl, getImageUrl } from '../utils/apiUrl';

const QuizResults = () => {
  const location = useLocation();
  const { accessCode } = useParams();
  const { results } = location.state || {};
  const [quiz, setQuiz] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl(`/api/quizzes/access/${accessCode}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setQuiz(data.quiz);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [accessCode]);

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06545E]"></div>
          <p className="mt-4 text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const score = results?.score || 0;
  const totalQuestions = quiz.questions.length;
  const correctAnswers = results?.correctAnswers || 0;
  const passMark = quiz.settings?.passMark || 60;
  
  // Fix the issue where 0/0 shows as "passed"
  // Only show passed if they have actually scored something and met the pass mark
  const passed = score >= passMark && totalQuestions > 0 && correctAnswers > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Quiz Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start">
            {quiz.image_url ? (
              <img
                src={getImageUrl(quiz.image_url)}
                alt={quiz.title}
                className="w-24 h-24 object-cover rounded-lg mr-6"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.display = 'block';
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg mr-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="mt-1 text-gray-500">{quiz.description}</p>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
              passed ? 'bg-green-100' : 'bg-red-100'
            } mb-4`}>
              <span className={`text-3xl font-bold ${
                passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {score}%
              </span>
            </div>
            <h2 className={`text-xl font-bold ${
              passed ? 'text-green-600' : 'text-red-600'
            } mb-2`}>
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {passed
                ? "You've successfully passed the quiz!"
                : `You'll need ${passMark}% to pass. Try again!`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {correctAnswers}/{totalQuestions}
              </div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {passMark}%
              </div>
              <div className="text-sm text-gray-600">Pass Mark</div>
            </div>
          </div>

          {/* Detailed Results */}
          {results?.answers && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Question Details</h3>
              <div className="space-y-4">
                {results.answers.map((answer, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      answer.correct ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`mt-1 mr-4 flex-shrink-0 ${
                        answer.correct ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {answer.correct ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Question {index + 1}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {answer.question}
                        </p>
                        {answer.explanation && (
                          <p className="mt-2 text-sm text-gray-500">
                            {answer.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            to={`/quiz/${accessCode}`}
            className="flex-1 px-4 py-2 bg-[#06545E] text-white text-center rounded-md hover:bg-[#06545E]/90"
          >
            Try Again
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 px-4 py-2 bg-white text-[#06545E] text-center border border-[#06545E] rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
