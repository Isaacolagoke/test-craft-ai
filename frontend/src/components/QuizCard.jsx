import React, { useState, useEffect } from 'react';
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
  QuestionMarkCircleIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import DeleteQuizModal from './DeleteQuizModal';
import ShareByEmailModal from './ShareByEmailModal';

const QuizCard = ({ quiz, onStatusChange }) => {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isShareByEmailModalOpen, setIsShareByEmailModalOpen] = React.useState(false);
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
  const [copied, setCopied] = React.useState({ code: false, url: false });
  const [parsedSettings, setParsedSettings] = React.useState({});

  // Parse settings on component mount or when quiz/settings change
  useEffect(() => {
    try {
      console.log('Quiz ID:', id, 'Title:', title, 'Settings type:', typeof settings);
      
      // Always initialize with direct properties from quiz object
      const initialSettings = {
        category: quiz.category,
        duration: quiz.timeLimit,
        timeUnit: quiz.timeUnit || 'minutes',
        complexity: quiz.complexity,
        accessCode: quiz.access_code
      };
      
      // Try parsing settings from string if needed
      if (typeof settings === 'string' && settings.trim()) {
        try {
          const parsed = JSON.parse(settings);
          // Merge parsed settings with initial settings, prioritizing parsed values
          setParsedSettings({...initialSettings, ...parsed});
          console.log('Successfully parsed settings string for quiz:', id);
        } catch (parseError) {
          console.error('Failed to parse settings string for quiz:', id, parseError);
          setParsedSettings(initialSettings);
        }
      } else if (settings && typeof settings === 'object') {
        // Settings is already an object, merge with initial settings
        setParsedSettings({...initialSettings, ...settings});
        console.log('Using object settings for quiz:', id);
      } else {
        // No valid settings found, use initial values
        setParsedSettings(initialSettings);
        console.log('Using extracted settings from quiz properties for quiz:', id);
      }
      
      // Log the processed settings for debugging
      console.log('Final parsed settings for quiz', id, ':', parsedSettings);
    } catch (e) {
      console.error('Error processing settings for quiz', id, ':', e);
      setParsedSettings({});
    }
  }, [id, quiz, settings]);

  // Capitalize first letter of title and description
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Get formatted settings values
  const getDuration = () => {
    // Check parsedSettings first
    if (parsedSettings?.duration) {
      const unit = parsedSettings.timeUnit || 'minutes';
      return `${parsedSettings.duration} ${unit}`;
    }
    
    // Then check direct quiz properties
    if (quiz.timeLimit) {
      const unit = quiz.timeUnit || 'minutes';
      return `${quiz.timeLimit} ${unit}`;
    }
    
    return 'Duration not set';
  };

  const getDifficulty = () => {
    // Check parsedSettings first
    if (parsedSettings?.complexity) {
      return capitalizeFirstLetter(parsedSettings.complexity);
    }
    
    // Then check direct quiz property
    if (quiz.complexity) {
      return capitalizeFirstLetter(quiz.complexity);
    }
    
    return 'Difficulty not set';
  };

  const getCategory = () => {
    // Check parsedSettings first
    if (parsedSettings?.category) {
      return parsedSettings.category;
    }
    
    // Then check direct quiz properties
    if (quiz.category) {
      return quiz.category;
    }
    
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

    // Use a publicly available placeholder image instead of a local one that doesn't exist on Render
    const defaultImage = 'https://placehold.co/600x400/e9e9e9/5d5d5d?text=Quiz+Image';
    
    // Use our new utility for consistent URL formatting
    const imageUrlToUse = quiz.image_url || 
                         quiz.imageUrl || 
                         quiz.image || 
                         (settings && settings.imageUrl) || 
                         defaultImage;
    
    // Don't run the URL through getImageUrl if it's our default placeholder
    return imageUrlToUse === defaultImage ? imageUrlToUse : getImageUrl(imageUrlToUse);
  };

  // Get quiz access code from wherever it might be stored
  const getAccessCode = () => {
    // Check all possible locations for the access code
    return access_code || 
           (parsedSettings && parsedSettings.accessCode) || 
           quiz.access_code || 
           (quiz.settings && typeof quiz.settings === 'object' && quiz.settings.accessCode) ||
           (quiz.settings && typeof quiz.settings === 'string' && 
             (() => {
               try {
                 return JSON.parse(quiz.settings).accessCode;
               } catch (e) {
                 return null;
               }
             })()
           );
  };

  // Generate the shareable URL for the quiz
  const getQuizUrl = () => {
    const quizCode = getAccessCode();
    console.log('getQuizUrl for quiz ID ' + id + ':', { quizCode, status });
    if (!quizCode || status !== 'published') return null;
    
    // Get base URL (works in production and development)
    const baseUrl = window.location.origin;
    // Fix: Use the correct route path that matches App.jsx
    return `${baseUrl}/quiz/${quizCode}`;
  };

  // Handle status change
  const handleStatusChange = async (action) => {
    try {
      setIsLoading(true);
      
      if (action === 'publish') {
        console.log(`Publishing quiz ${id}...`);
        
        // Use the proper API endpoint
        const response = await quizzes.publish(id);
        console.log('Publish result:', response);
        
        // Extract the quiz data from the response
        const updatedQuiz = response.data?.quiz || {};
        
        // Update the parent component with the new quiz data
        if (onStatusChange) {
          onStatusChange({
            ...quiz,
            status: 'published',
            settings: updatedQuiz.settings || parsedSettings,
            published_at: updatedQuiz.published_at || new Date().toISOString()
          });
        }
        
        // Show success message
        toast.success('Quiz published successfully');
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

  // Copy access code or URL to clipboard
  const copyToClipboard = (text, type) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        // Set copied state for this type
        setCopied({...copied, [type]: true});
        
        // Reset after 2 seconds
        setTimeout(() => {
          setCopied({...copied, [type]: false});
        }, 2000);
        
        toast.success(`${type === 'code' ? 'Access code' : 'Quiz URL'} copied to clipboard`);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  // Debug what we actually have for settings, status, and access code
  React.useEffect(() => {
    console.log('Quiz card data for ID ' + id + ':', {
      status,
      accessCode: access_code, 
      settingsAccessCode: parsedSettings?.accessCode,
      settings: parsedSettings
    });
  }, [id, status, access_code, parsedSettings]);

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
                e.target.src = 'https://placehold.co/600x400/e9e9e9/5d5d5d?text=Quiz+Image';
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
                          to={status === 'published' && (access_code || parsedSettings?.accessCode) ? `/quiz/${access_code || parsedSettings?.accessCode}/view` : '#'}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm ${
                            (!access_code && !parsedSettings?.accessCode) || status !== 'published' ? 'text-gray-400 cursor-not-allowed' : ''
                          }`}
                          onClick={(e) => {
                            if ((!access_code && !parsedSettings?.accessCode) || status !== 'published') {
                              e.preventDefault();
                              toast.error('Quiz not available for viewing');
                            } else {
                              console.log('Navigating to quiz view with code:', access_code || parsedSettings?.accessCode);
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
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setIsShareByEmailModalOpen(true)}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                        >
                          <EnvelopeIcon className="w-5 h-5 mr-2" />
                          Share via Email
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
              <span className={`text-sm ${!parsedSettings?.duration ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                {getDuration()}
              </span>
            </div>
            <div className="flex items-center">
              <AcademicCapIcon className="w-4 h-4 text-gray-500 mr-1.5" />
              <span className={`text-sm ${!parsedSettings?.complexity ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                {getDifficulty()}
              </span>
            </div>
          </div>

          {/* Sharing Information - Redesigned to be compact */}
          {status === 'published' && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Share with learners:</h3>
                
                {/* Copy URL Button */}
                <button 
                  onClick={() => copyToClipboard(getQuizUrl(), 'url')}
                  className="flex items-center px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded text-sm text-gray-600 transition-colors"
                  disabled={!getQuizUrl()}
                  title="Copy quiz URL"
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Copy URL
                  {copied.url && <span className="ml-1 text-primary">✓</span>}
                </button>
              </div>
              
              {/* Access Code Display */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">Code:</span>
                  <span className="text-sm font-mono font-medium">
                    {getAccessCode() || (
                      <span className="text-gray-400 text-xs">Processing...</span>
                    )}
                  </span>
                </div>
                <button 
                  onClick={() => copyToClipboard(getAccessCode(), 'code')}
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
                  title="Copy access code"
                  disabled={!getAccessCode()}
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  {copied.code && <span className="sr-only">Copied!</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteQuizModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={title}
        isLoading={isLoading}
      />
      <ShareByEmailModal
        isOpen={isShareByEmailModalOpen}
        onClose={() => setIsShareByEmailModalOpen(false)}
        quiz={quiz}
      />
    </>
  );
};

export default QuizCard;
