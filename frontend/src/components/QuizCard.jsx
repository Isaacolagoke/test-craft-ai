import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { getImageUrl } from '../utils/apiUrl';
import { quizzes } from '../api';
import { toast } from 'react-hot-toast';
import { 
  EyeIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon
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
    imageUrl,
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
    // Debug what we actually have for duration
    console.log('Duration data for quiz ID ' + id + ':', {
      settingsDuration: settings?.duration,
      settingsTimeUnit: settings?.timeUnit,
      quizTimeLimit: quiz.timeLimit,
      quizTimeUnit: quiz.timeUnit,
      accessCode: access_code,
      rawSettings: settings
    });
    
    if (settings?.duration) return `${settings.duration} ${settings.timeUnit || 'minutes'}`;
    if (quiz.timeLimit) return `${quiz.timeLimit} ${quiz.timeUnit || 'minutes'}`;
    return 'Duration not set';
  };

  const getDifficulty = () => {
    if (settings?.complexity) return capitalizeFirstLetter(settings.complexity);
    if (quiz.complexity) return capitalizeFirstLetter(quiz.complexity);
    return 'Difficulty not set';
  };

  const getCategory = () => {
    if (settings?.category) return settings.category;
    if (category || quiz.category) return category || quiz.category;
    return 'Subject not set';
  };

  // Fix image URL rendering with our utility function
  const getCardImageUrl = () => {
    // Parse settings if it's a string
    let settings = quiz.settings;
    if (typeof settings === 'string' && settings) {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        console.error('Error parsing quiz settings:', e);
        settings = {};
      }
    }

    const defaultImage = '/uploads/quiz-images/default-quiz.jpg';
    
    // Use our new utility for consistent URL formatting
    const imageUrlToUse = quiz.image_url || 
                         quiz.imageUrl || 
                         quiz.image || 
                         (settings && settings.imageUrl) || 
                         defaultImage;
    
    return getImageUrl(imageUrlToUse);
  };

  // Handle status change
  const handleStatusChange = async (action) => {
    try {
      setIsLoading(true);
      if (action === 'publish') {
        const response = await quizzes.publish(id);
        if (response.data?.success) {
          toast.success('Quiz published successfully');
          if (onStatusChange) onStatusChange({ ...quiz, status: 'published' });
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

  return (
    <>
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        {/* Card Header - Image and Menu */}
        <div className="relative">
          <div className="aspect-[16/9] overflow-hidden rounded-t-xl">
            <img 
              src={getCardImageUrl()} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Failed to load image:', getCardImageUrl());
                e.target.src = '/uploads/quiz-images/default-quiz.jpg';
              }}
            />
            
            {/* Status Badge - Overlay on image */}
            <div className="absolute top-3 left-3">
              {status === 'published' ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-primary border border-gray-200">
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  Draft
                </span>
              )}
            </div>
            
            {/* Options Menu */}
            <div className="absolute top-3 right-3">
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="inline-flex items-center px-2 py-1 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to={status === 'published' && (access_code || settings?.accessCode) ? `/quiz/${access_code || settings?.accessCode}/view` : '#'}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                            (!access_code && !settings?.accessCode) || status !== 'published' ? 'text-gray-400 cursor-not-allowed' : ''
                          }`}
                          onClick={(e) => {
                            if ((!access_code && !settings?.accessCode) || status !== 'published') {
                              e.preventDefault();
                              toast.error('Quiz not available for viewing');
                            } else {
                              console.log('Navigating to quiz view with code:', access_code || settings?.accessCode);
                            }
                          }}
                        >
                          <EyeIcon className="w-5 h-5 mr-2" />
                          View Quiz
                        </Link>
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
                    {/* View Submissions (Only for published quizzes) */}
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to={status === 'published' ? `/quiz/${id}/submissions` : '#'}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                            status !== 'published' ? 'text-gray-400 cursor-not-allowed' : ''
                          }`}
                          onClick={(e) => {
                            if (status !== 'published') {
                              e.preventDefault();
                              toast.error('No submissions available for unpublished quizzes');
                            }
                          }}
                        >
                          <BookOpenIcon className="w-5 h-5 mr-2" />
                          View Submissions
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className={`${
                            active ? 'bg-red-50' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
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
        </div>
        
        {/* Card Content */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-1 line-clamp-1 leading-tight text-gray-900">{capitalizeFirstLetter(title)}</h2>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-snug">{capitalizeFirstLetter(description)}</p>
          
          {/* Quiz Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center">
              <BookOpenIcon className="w-4 h-4 text-gray-500 mr-1.5" />
              <span className={`text-sm ${!getCategory() || getCategory() === 'Subject not set' ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                {getCategory()}
              </span>
            </div>
            <div className="flex items-center">
              <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 mr-1.5" />
              <span className="text-sm text-gray-800 font-medium">
                {questions.length} Questions
              </span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 text-gray-500 mr-1.5" />
              <span className={`text-sm ${!settings?.duration ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                {getDuration()}
              </span>
            </div>
            <div className="flex items-center">
              <AcademicCapIcon className="w-4 h-4 text-gray-500 mr-1.5" />
              <span className={`text-sm ${!settings?.complexity ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
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
