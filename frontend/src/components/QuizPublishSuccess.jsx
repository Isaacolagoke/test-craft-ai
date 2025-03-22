import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const QuizPublishSuccess = ({ isOpen, onClose, accessCode, accessLink }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success('Access code copied to clipboard!');
  };

  const shareQuiz = () => {
    const shareUrl = `${window.location.origin}/quiz/${accessCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Quiz link copied to clipboard!');
  };

  const handleClose = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quiz Published Successfully!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Your quiz is now live and ready to be shared with learners.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Access Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              readOnly
              className="flex-1 p-2 border rounded-md bg-gray-50"
            />
            <button
              onClick={copyAccessCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={shareQuiz}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Share Quiz Link
          </button>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizPublishSuccess;
