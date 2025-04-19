import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EnvelopeIcon, ClipboardIcon, LinkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getApiUrl } from '../utils/apiUrl';

const QuizPublishSuccess = ({ isOpen, onClose, accessCode, accessLink }) => {
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState('');
  const [emails, setEmails] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Generate the full quiz URL to share
  const quizUrl = `${window.location.origin}/quiz/${accessCode}`;

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success('Access code copied to clipboard!');
  };

  const shareQuizLink = () => {
    navigator.clipboard.writeText(quizUrl);
    toast.success('Quiz link copied to clipboard!');
  };

  const handleClose = () => {
    onClose();
    navigate('/dashboard');
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    if (!currentEmail.trim()) {
      return;
    }

    if (!validateEmail(currentEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.includes(currentEmail)) {
      toast.error('This email has already been added');
      return;
    }

    setEmails([...emails, currentEmail]);
    setCurrentEmail('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const removeEmail = (emailToRemove) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const sendInvitations = async () => {
    if (emails.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/quizzes/share-by-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          emails: emails,
          quizLink: quizUrl,
          message: customMessage,
          accessCode: accessCode
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Invitations sent successfully!');
        setEmails([]);
        setCustomMessage('');
      } else {
        throw new Error(data.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error(error.message || 'Failed to send invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Quiz Published</h3>
          <p className="text-sm text-gray-600 mt-1">
            Your quiz is live and ready to share
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              readOnly
              className="flex-1 p-2 border rounded-md bg-gray-50"
            />
            <button
              onClick={copyAccessCode}
              className="p-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              title="Copy access code"
            >
              <ClipboardIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Invite Learners</label>
          <div className="relative">
            <input
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="email@example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={handleAddEmail}
              className="absolute inset-y-0 right-0 px-3 flex items-center bg-teal-500 text-white rounded-r-md hover:bg-teal-600"
            >
              <span className="font-medium text-sm">Add</span>
            </button>
          </div>
        </div>

        {/* List of added emails */}
        {emails.length > 0 && (
          <div className="mb-4">
            <div className="mt-1 flex flex-wrap gap-2">
              {emails.map((email, index) => (
                <div key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-teal-100 text-teal-800">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-teal-400 hover:bg-teal-200 hover:text-teal-500"
                  >
                    <span className="sr-only">Remove</span>
                    <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Message (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Write a personal message..."
            className="w-full h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
          ></textarea>
          
          <div className="text-sm text-gray-500 mt-1">
            <p>Quiz URL: <span className="font-medium">{quizUrl}</span></p>
          </div>
        </div>

        <button
          onClick={sendInvitations}
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 mb-4"
        >
          <EnvelopeIcon className="mr-2 h-5 w-5" />
          Send Invitations
        </button>

        <button
          onClick={shareQuizLink}
          className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 mb-4"
        >
          <LinkIcon className="mr-2 h-5 w-5" />
          Share Quiz Link
        </button>

        <button
          onClick={handleClose}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <ArrowLeftIcon className="mr-2 h-5 w-5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default QuizPublishSuccess;
