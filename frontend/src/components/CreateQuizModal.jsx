import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import quizSvg from '../assets/quiz.svg';
import assignmentSvg from '../assets/assignment.svg';

const CreateQuizModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  const handleManualCreate = () => {
    navigate('/create-quiz', { state: { method: 'manual' } });
    onClose();
  };
  
  const handleAICreate = () => {
    navigate('/create-quiz', { state: { method: 'ai' } });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full rounded-lg bg-white">
          {/* Header with close button */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <Dialog.Title as="h2" className="text-2xl font-semibold text-gray-900">
                Create new Quiz
              </Dialog.Title>
              <p className="text-gray-500 mt-1">Create and manage your contents.</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 rounded-full p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Options */}
          <div className="p-6 space-y-6">
            {/* Manual Creation Option */}
            <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-24 h-20 flex items-center justify-center">
                  <img src={quizSvg} alt="Manual quiz" className="w-16 h-16" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Create Quiz Manually</h3>
                <p className="text-gray-600 mb-4">Create quick test and grade your learners. Perfect for on the spot assessment</p>
                <button 
                  onClick={handleManualCreate}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full font-medium text-sm"
                >
                  CREATE QUIZ MANUALLY
                </button>
              </div>
            </div>
            
            {/* AI Creation Option */}
            <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-24 h-20 flex items-center justify-center">
                  <img src={assignmentSvg} alt="AI quiz" className="w-16 h-16" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Create Quiz with AI</h3>
                <p className="text-gray-600 mb-4">Create quick test and grade your learners. Perfect for on the spot assessment</p>
                <button 
                  onClick={handleAICreate}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full font-medium text-sm"
                >
                  CREATE QUIZ WITH AI
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateQuizModal;
