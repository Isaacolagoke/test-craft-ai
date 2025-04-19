import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { getImageUrl } from '../utils/apiUrl';
import { quizzes } from '../api';
import { toast } from 'react-hot-toast';
import logger from '../utils/logger';
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

const QuizCard = ({ quiz, onStatusChange, isListView }) => {
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
    category,
    subject,
    duration,
    timeLimit,
    timeUnit,
    difficulty,
    complexity
  } = quiz;

  const [isLoading, setIsLoading] = React.useState(false);
  const [copied, setCopied] = React.useState({ code: false, url: false });
  const [parsedSettings, setParsedSettings] = React.useState({});

  // Parse settings on component mount or when quiz/settings change
  useEffect(() => {
    try {
      logger.info('Quiz ID:', id, 'Title:', title, 'Settings type:', typeof settings);
      
      // Always initialize with direct properties from quiz object
      const initialSettings = {
        subject: quiz.subject || quiz.category || 'General',
        category: quiz.category || quiz.subject || 'General',
        duration: quiz.duration || quiz.timeLimit || 10,
        timeUnit: quiz.timeUnit || 'minutes',
        difficulty: quiz.difficulty || quiz.complexity || 'Medium',
        accessCode: quiz.access_code
      };
      
      // Try parsing settings from string if needed
      let parsedSettings = initialSettings;
      
      if (typeof settings === 'string' && settings.trim()) {
        try {
          const parsed = JSON.parse(settings);
          // Merge parsed settings with initial settings, prioritizing parsed values
          parsedSettings = {...initialSettings, ...parsed};
          logger.info('Successfully parsed settings string for quiz:', id);
        } catch (parseError) {
          logger.error('Failed to parse settings string for quiz:', id, parseError);
        }
      } else if (settings && typeof settings === 'object') {
        // Settings is already an object, merge with initial settings
        parsedSettings = {...initialSettings, ...settings};
        logger.info('Using object settings for quiz:', id);
      }
      
      // Debug log the actual values we're working with
      logger.info('Final parsed settings for quiz', id, ':' , {
        subject: parsedSettings.subject,
        category: parsedSettings.category,
        duration: parsedSettings.duration,
        timeUnit: parsedSettings.timeUnit,
        difficulty: parsedSettings.difficulty,
        accessCode: parsedSettings.accessCode
      });
      
      // Update the state
      setParsedSettings(parsedSettings);
      
      // Force a refresh of the access code display
      if (access_code) {
        setTimeout(() => {
          const codeDisplay = document.getElementById(`access-code-${id}`);
          if (codeDisplay) {
            codeDisplay.textContent = access_code;
          }
        }, 100);
      }
    } catch (e) {
      logger.error('Error processing settings for quiz', id, ':', e);
      setParsedSettings({});
    }
  }, [id, quiz, settings, access_code]);

  // Capitalize first letter of title and description
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Get formatted settings values with improved debugging
  const getDuration = () => {
    logger.info('Getting duration for quiz', id, ':', parsedSettings?.duration, parsedSettings?.timeUnit);
    
    // Check parsedSettings first
    if (parsedSettings?.duration) {
      const unit = parsedSettings.timeUnit || 'minutes';
      return `${parsedSettings.duration} ${unit}`;
    }
    
    // Then check direct quiz properties
    if (quiz.duration) {
      const unit = quiz.timeUnit || 'minutes';
      return `${quiz.duration} ${unit}`;
    }
    
    return 'Duration not set';
  };

  const getDifficulty = () => {
    logger.info('Getting difficulty for quiz', id, ':', parsedSettings?.difficulty);
    
    // Check parsedSettings first
    if (parsedSettings?.difficulty) {
      return capitalizeFirstLetter(parsedSettings.difficulty);
    }
    
    // Then check direct quiz property
    if (quiz.difficulty) {
      return capitalizeFirstLetter(quiz.difficulty);
    }
    
    return 'Difficulty not set';
  };

  const getCategory = () => {
    logger.info('Getting category for quiz', id, ':', parsedSettings?.category);
    
    // Check parsedSettings first
    if (parsedSettings?.category) {
      return capitalizeFirstLetter(parsedSettings.category);
    }
    
    // Then check direct quiz property
    if (quiz.category) {
      return capitalizeFirstLetter(quiz.category);
    }
    
    return 'Subject not set';
  };

  const getSubject = () => {
    logger.info('Getting subject for quiz', id, ':', parsedSettings?.subject);
    
    // Check parsedSettings first
    if (parsedSettings?.subject) {
      return capitalizeFirstLetter(parsedSettings.subject);
    }
    
    // Then check direct quiz properties
    if (quiz.subject) {
      return capitalizeFirstLetter(quiz.subject);
    }
    
    return 'Subject not set';
  };

  // Fix image URL rendering with our utility function
  const getCardImageUrl = () => {
    // For list view, don't return any image URL
    if (isListView) {
      return null;
    }
    
    // Parse settings if it's a string
    let settings = quiz.settings;
    if (typeof settings === 'string' && settings) {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        logger.error('Error parsing quiz settings:', e);
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
    logger.info('getQuizUrl for quiz ID ' + id + ':', { quizCode, status });
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
        logger.info(`Publishing quiz ${id}...`);
        
        // Use the proper API endpoint
        const response = await quizzes.publish(id);
        logger.info('Publish result:', response);
        
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
      logger.error('Error updating quiz status:', error);
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
      logger.error('Error deleting quiz:', error);
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
        logger.error('Failed to copy:', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  // Debug what we actually have for settings, status, and access code
  React.useEffect(() => {
    logger.info('Quiz card data for ID ' + id + ':', {
      status,
      accessCode: access_code, 
      settingsAccessCode: parsedSettings?.accessCode,
      settings: parsedSettings
    });
  }, [id, status, access_code, parsedSettings]);

  return (
    <>
      <article 
        className={`group relative ${isListView ? 'flex gap-4 items-center' : 'h-full'}`}
        aria-label={`Quiz: ${title}`}
      >
        {/* Quiz Status Indicator */}
        <div className="absolute right-0 top-0 z-10 p-2">
          <span 
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full
              ${status === 'published' ? 'bg-green-100 text-green-800' : 
                status === 'draft' ? 'bg-amber-100 text-amber-800' : 
                'bg-slate-100 text-slate-800'}`}
          >
            {status === 'published' ? 'Published' : 
             status === 'draft' ? 'Draft' : 'Archived'}
          </span>
        </div>

        {/* Quiz Image or Icon */}
        {isListView ? (
          <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
            <BookOpenIcon className="w-6 h-6 text-slate-600" />
          </div>
        ) : (
          <div 
            className="relative mb-4 w-full aspect-video rounded-xl overflow-hidden bg-slate-100"
          >
            <img 
              src={getCardImageUrl()} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://placehold.co/600x400/e9e9e9/5d5d5d?text=Quiz+Image';
              }}
            />
          </div>
        )}

        {/* Quiz Content */}
        <div className={`flex flex-col ${isListView ? 'flex-1' : ''}`}>
          {/* Quiz Title and Menu */}
          <div className="flex items-start justify-between mb-2">
            <div className={`${isListView ? 'w-3/4' : 'w-full'}`}>
              <h3 className="font-semibold text-slate-900 group-hover:text-[#06545E] line-clamp-2">
                {title}
              </h3>
              {!isListView && (
                <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                  {description || 'No description provided'}
                </p>
              )}
            </div>
            
            {/* Quick Stats (Only show in list view) */}
            {isListView && (
              <div className="flex items-center gap-4 text-xs text-slate-600 ml-auto mr-4">
                <div className="flex items-center gap-1">
                  <QuestionMarkCircleIcon className="w-4 h-4" />
                  <span>{questions.length || 0}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{parsedSettings.duration || 10} min</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <AcademicCapIcon className="w-4 h-4" />
                  <span>{parsedSettings.difficulty || 'Medium'}</span>
                </div>
              </div>
            )}
            
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
                              logger.info('Navigating to quiz view with code:', access_code || parsedSettings?.accessCode);
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
          
          {/* Card Stats Grid */}
          {!isListView && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center">
                <BookOpenIcon className="w-4 h-4 text-gray-500 mr-1.5" />
                <span className={`text-sm ${!getSubject() || getSubject() === 'Subject not set' ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                  {getSubject()}
                </span>
              </div>
              <div className="flex items-center">
                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 mr-1.5" />
                <span className="text-sm text-gray-800 font-medium">
                  {questions.length || 0} Questions
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
                <span className={`text-sm ${!parsedSettings?.difficulty ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                  {getDifficulty()}
                </span>
              </div>
            </div>
          )}
          
          {/* Sharing Section - Only show for published quizzes */}
          {status === 'published' && (parsedSettings?.accessCode || access_code) && (
            <div className="mt-5">
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Share with learners:</h4>
                
                <div className="flex flex-col gap-3">
                  {/* Copy URL Button */}
                  <div className="flex items-center">
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/quiz/${access_code || parsedSettings?.accessCode}`, 'url')}
                      className="text-white bg-teal-600 hover:bg-teal-700 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                      <LinkIcon className="w-4 h-4 mr-1.5" />
                      {copied.url ? 'Copied!' : 'Copy URL'}
                    </button>
                    
                    {/* Email Share Button */}
                    <button
                      onClick={() => setIsShareByEmailModalOpen(true)}
                      className="ml-2 text-white bg-teal-600 hover:bg-teal-700 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4 mr-1.5" />
                      Email
                    </button>
                  </div>
                  
                  {/* Access Code Display */}
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">Code:</div>
                    <div className="bg-gray-50 rounded px-2 py-1 text-sm font-medium font-mono text-gray-800 flex-grow" id={`access-code-${id}`}>
                      {access_code || parsedSettings?.accessCode || 'Processing...'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(access_code || parsedSettings?.accessCode, 'code')}
                      className="text-primary hover:text-primary-dark p-1 rounded-md hover:bg-gray-100"
                      title="Copy access code"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>

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
