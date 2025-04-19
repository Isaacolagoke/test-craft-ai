import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import { EnvelopeIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';

const ShareByEmailModal = ({ isOpen, onClose, quiz }) => {
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Generate the quiz URL
  const getQuizUrl = () => {
    if (!quiz) return '';
    
    // Check if we have an access code
    let accessCode = null;
    if (quiz.settings && typeof quiz.settings === 'object' && quiz.settings.accessCode) {
      accessCode = quiz.settings.accessCode;
    } else if (quiz.settings && typeof quiz.settings === 'string') {
      try {
        const parsed = JSON.parse(quiz.settings);
        if (parsed.accessCode) accessCode = parsed.accessCode;
      } catch (e) {
        console.error('Error parsing quiz settings:', e);
      }
    } else if (quiz.access_code) {
      accessCode = quiz.access_code;
    }
    
    if (!accessCode || quiz.status !== 'published') return '';
    
    // Get base URL (works in production and development)
    const baseUrl = window.location.origin;
    return `${baseUrl}/quiz/${accessCode}`;
  };

  // Handle adding an email
  const handleAddEmail = () => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (emails.includes(currentEmail)) {
      toast.error('This email is already added');
      return;
    }
    
    setEmails([...emails, currentEmail]);
    setCurrentEmail('');
  };

  // Handle removing an email
  const handleRemoveEmail = (emailToRemove) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  // Handle key press (allow Enter to add email)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  // Handle sending invitations
  const handleSendInvitations = async () => {
    if (emails.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }
    
    const quizUrl = getQuizUrl();
    if (!quizUrl) {
      toast.error('Unable to generate quiz URL. Is the quiz published?');
      return;
    }
    
    setIsLoading(true);
    try {
      // In a real implementation, you would call an API endpoint here
      // For now, we'll just simulate success
      
      // Mock API call to send emails
      setTimeout(() => {
        toast.success(`Invitations sent successfully to ${emails.length} learners`);
        setIsLoading(false);
        setEmails([]);
        setCustomMessage('');
        onClose();
      }, 1500);
      
      // Actual API call would look something like this:
      /*
      const response = await fetch('/api/quizzes/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.id,
          emails,
          message: customMessage,
          accessCode: accessCode
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitations');
      }
      
      toast.success(`Invitations sent successfully to ${emails.length} learners`);
      setEmails([]);
      setCustomMessage('');
      onClose();
      */
      
    } catch (error) {
      toast.error('Failed to send invitations');
      console.error('Error sending invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Share Quiz via Email</h3>
          <p className="text-sm text-gray-500 mt-2">
            Invite learners to take this quiz by sending them a direct link.
          </p>
        </div>
        
        {/* Quiz Info */}
        {quiz && (
          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <div className="font-medium">{quiz.title}</div>
            <div className="text-sm text-gray-600">{getQuizUrl() || 'Quiz not published yet'}</div>
          </div>
        )}
        
        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter Learner's Email
          </label>
          <div className="flex">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="email@example.com"
                className="block w-full rounded-md border-gray-300 shadow-sm pl-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddEmail}
              className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <UserPlusIcon className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>
        </div>
        
        {/* Email List */}
        {emails.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients ({emails.length})
            </label>
            <div className="bg-gray-50 rounded-md p-2 min-h-[80px] max-h-[140px] overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {emails.map((email, index) => (
                  <div 
                    key={index} 
                    className="inline-flex items-center bg-white px-2 py-1 rounded-md text-sm border border-gray-200"
                  >
                    <span className="mr-1">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Message */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add a Custom Message (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            placeholder="Write a personal message to include in the invitation email..."
          />
        </div>
        
        {/* Actions */}
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <button
            type="button"
            onClick={handleSendInvitations}
            disabled={isLoading || emails.length === 0}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Invitations'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:col-start-1 sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareByEmailModal;
