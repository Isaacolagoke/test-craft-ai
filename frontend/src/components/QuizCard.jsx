import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import defaultImage from "../assets/empty-state.png";
import { quizzes } from '../api';
import { toast } from 'react-hot-toast';
import { 
  EyeIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import DeleteQuizModal from './DeleteQuizModal';

const QuizCard = ({ quiz, onStatusChange }) => {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const {
    id,
    title,
    description,
    image_url,
    status,
    access_code,
    created_at,
    settings = {},
    questions = [],
    category
  } = quiz;

  const [isLoading, setIsLoading] = React.useState(false);

  // Capitalize first letter of title and description
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Get formatted settings values
  const getDuration = () => {
    if (!settings?.duration) return 'Duration not set';
    return `${settings.duration} minutes`;
  };

  const getDifficulty = () => {
    if (!settings?.complexity) return 'Difficulty not set';
    return capitalizeFirstLetter(settings.complexity);
  };

  const getCategory = () => {
    if (!category) return 'Subject not set';
    return capitalizeFirstLetter(category);
  };

  // Handle status change
  const handleStatusChange = async (action) => {
    try {
      setIsLoading(true);
      if (action === 'publish') {
        const response = await quizzes.publish(id);
        if (response.data?.success) {
          toast.success('Quiz published successfully');
        } else {
          throw new Error('Failed to publish quiz');
        }
      } else if (action === 'pause') {
        const response = await quizzes.pause(id);
        if (response.data?.success) {
          toast.success('Quiz paused successfully');
        } else {
          throw new Error('Failed to pause quiz');
        }
      }
      // Notify parent component to refresh quiz list
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating quiz status:', error);
      toast.error(error.response?.data?.error || 'Failed to update quiz status');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const response = await quizzes.delete(id);
      if (response.data?.success) {
        toast.success('Quiz deleted successfully');
        setIsDeleteModalOpen(false);
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        throw new Error('Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error(error.response?.data?.error || 'Failed to delete quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const imageUrl = image_url ? `http://localhost:3001${image_url}` : defaultImage;

  return (
    <>
      <div className="bg-slate-50 rounded-lg overflow-hidden">
        <div className="relative">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
          />
          <div className="absolute top-4 right-4">
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="p-2 bg-slate-50 rounded-full shadow-sm hover:bg-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate(`/quiz/${id}/view`)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <EyeIcon className="w-5 h-5 mr-2" />
                        View Quiz
                      </button>
                    )}
                  </Menu.Item>
                  {status === 'published' ? (
                    <Menu.Item disabled={isLoading}>
                      {({ active }) => (
                        <button
                          onClick={() => handleStatusChange('pause')}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <PauseIcon className="w-5 h-5 mr-2" />
                          {isLoading ? 'Pausing...' : 'Pause Quiz'}
                        </button>
                      )}
                    </Menu.Item>
                  ) : (
                    <Menu.Item disabled={isLoading}>
                      {({ active }) => (
                        <button
                          onClick={() => handleStatusChange('publish')}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <PlayIcon className="w-5 h-5 mr-2" />
                          {isLoading ? 'Publishing...' : 'Publish Quiz'}
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item disabled={isLoading}>
                    {({ active }) => (
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600 ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <TrashIcon className="w-5 h-5 mr-2" />
                        Delete Quiz
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
        
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2 line-clamp-2 leading-[1.2] first-letter:capitalize">{capitalizeFirstLetter(title)}</h2>
          <p className="text-gray-600 text-sm mb-2 first-letter:capitalize">{capitalizeFirstLetter(description)}</p>
          
          <div className="mb-4">
            {status === 'published' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-primary">
                Active • Receiving Responses
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600 block">Subject</span>
              <span className={`font-medium ${!category ? 'text-gray-500' : 'text-gray-900'}`}>
                {getCategory()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">Questions</span>
              <span className="font-medium text-gray-900">
                {questions.length} Questions
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">Duration</span>
              <span className={`font-medium ${!settings?.duration ? 'text-gray-500' : 'text-gray-900'}`}>
                {getDuration()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">Difficulty</span>
              <span className={`font-medium ${!settings?.complexity ? 'text-gray-500' : 'text-gray-900'}`}>
                {getDifficulty()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DeleteQuizModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={title}
        isLoading={isLoading}
      />
    </>
  );
};

export default QuizCard;
