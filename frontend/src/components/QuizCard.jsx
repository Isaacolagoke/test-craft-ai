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

const defaultImage = 'https://placehold.co/600x400/e9e9e9/5d5d5d?text=Quiz+Image';

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
      // Log the received data for debugging
      logger.info('Processing quiz data:', {
        id,
        title,
        settings: typeof settings === 'string' ? 'string (will parse)' : typeof settings,
        direct_fields: {
          subject,
          category,
          duration,
          timeLimit,
          difficulty,
          complexity
        }
      });
      
      // Always initialize with direct properties from quiz object
      const initialSettings = {
        subject: subject || category || 'General',
        category: category || subject || 'General',
        duration: duration || timeLimit || 10,
        timeUnit: timeUnit || 'minutes',
        difficulty: difficulty || complexity || 'Medium',
        accessCode: access_code
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
      }
      
      // Ensure we have sensible defaults/values for common fields
      parsedSettings.subject = parsedSettings.subject || parsedSettings.category || 'General';
      parsedSettings.category = parsedSettings.category || parsedSettings.subject || 'General';
      parsedSettings.duration = Number(parsedSettings.duration || 10);
      parsedSettings.timeUnit = parsedSettings.timeUnit || 'minutes';
      parsedSettings.difficulty = parsedSettings.difficulty || 'Medium';
      
      // Debug log the actual values we're working with
      logger.info('Final parsed settings for quiz', id, ':', parsedSettings);
      
      // Update the state with the properly parsed settings
      setParsedSettings(parsedSettings);
      
    } catch (err) {
      logger.error('Error parsing settings for quiz:', id, err);
      // Set to empty object with defaults as fallback
      setParsedSettings({
        subject: subject || category || 'General',
        duration: duration || timeLimit || 10,
        difficulty: difficulty || complexity || 'Medium'
      });
    }
  }, [id, quiz, settings, access_code, subject, category, duration, timeLimit, difficulty, complexity, timeUnit]);

  // Helper functions for formatting
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const getSubject = () => {
    const subjectValue = parsedSettings?.subject || 
                        parsedSettings?.category || 
                        subject || 
                        category || 
                        'General';
    return capitalizeFirstLetter(subjectValue);
  };

  const getDuration = () => {
    const time = parsedSettings?.duration || duration || timeLimit || 10;
    const unit = parsedSettings?.timeUnit || timeUnit || 'minutes';
    return `${time} ${unit}`;
  };

  const getDifficulty = () => {
    const difficultyValue = parsedSettings?.difficulty || 
                           difficulty || 
                           complexity || 
                           'Medium';
    return capitalizeFirstLetter(difficultyValue);
  };

  // Fix image URL rendering with our utility function
  const getCardImageUrl = () => {
    // Parse settings if it's a string
    let settings = quiz.settings;
    if (typeof settings === 'string' && settings) {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        logger.error('Failed to parse settings string:', e);
      }
    }

    const imageUrlToUse = quiz.image_url || 
                          quiz.imageUrl || 
                          quiz.image || 
                          (settings && settings.imageUrl) || 
                          defaultImage;
    
    if (!imageUrlToUse) return defaultImage;
    
    // If it's already a full URL, return it as is
    if (imageUrlToUse.startsWith('http')) {
      return imageUrlToUse;
    }
    
    // Otherwise, it's a path, so resolve it
    return `/assets/images/${imageUrlToUse}`;
  };

  const handleCopy = (type, value) => {
    if (!value) {
      toast.error(`No ${type} available to copy`);
      return;
    }
    
    navigator.clipboard.writeText(value)
      .then(() => {
        setCopied(prev => ({ ...prev, [type]: true }));
        toast.success(`${capitalizeFirstLetter(type)} copied to clipboard!`);
        setTimeout(() => {
          setCopied(prev => ({ ...prev, [type]: false }));
        }, 2000);
      })
      .catch(err => {
        logger.error('Failed to copy to clipboard:', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  const getQuizUrl = () => {
    const accessCode = parsedSettings?.accessCode || access_code;
    if (!accessCode) return '';
    
    return `${window.location.origin}/quiz/${accessCode}`;
  };

  const toggleQuizStatus = async () => {
    try {
      setIsLoading(true);
      
      const newStatus = status === 'published' ? 'archived' : 'published';
      
      await quizzes.updateQuizStatus(id, newStatus);
      
      toast.success(`Quiz ${newStatus === 'published' ? 'published' : 'archived'} successfully`);
      
      if (onStatusChange) {
        onStatusChange();
      }
      
    } catch (error) {
      logger.error('Error toggling quiz status:', error);
      toast.error('Failed to update quiz status');
    } finally {
      setIsLoading(false);
    }
  };

  const shareViaEmail = () => {
    setIsShareByEmailModalOpen(true);
  };

  const handleDeleteQuiz = () => {
    setIsDeleteModalOpen(true);
  };

  // Render different card layouts based on isListView prop
  if (isListView) {
    // LIST VIEW
    return (
      <>
        <div className="flex items-center gap-4">
          {/* Quiz Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
            <BookOpenIcon className="w-6 h-6 text-slate-600" />
          </div>
          
          {/* Quiz Content */}
          <div className="flex-grow">
            <h3 className="font-semibold text-gray-900">
              {capitalizeFirstLetter(title)}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 line-clamp-1">
                {capitalizeFirstLetter(description)}
              </p>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <QuestionMarkCircleIcon className="w-4 h-4" />
              <span>{questions?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{getDuration()}</span>
            </div>
            <div className="flex items-center gap-1">
              <AcademicCapIcon className="w-4 h-4" />
              <span>{getDifficulty()}</span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div>
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
          
          {/* Menu */}
          <div>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </Menu.Button>
              
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg z-10">
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate(`/quiz/${id}/view`)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                      >
                        <EyeIcon className="w-4 h-4 mr-2 text-gray-500" />
                        View Details
                      </button>
                    )}
                  </Menu.Item>
                  
                  {status === 'published' && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={toggleQuizStatus}
                          disabled={isLoading}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                        >
                          <PauseIcon className="w-4 h-4 mr-2 text-gray-500" />
                          Archive Quiz
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  
                  {status !== 'published' && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={toggleQuizStatus}
                          disabled={isLoading}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                        >
                          <PlayIcon className="w-4 h-4 mr-2 text-gray-500" />
                          Publish Quiz
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  
                  {status === 'published' && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={shareViaEmail}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                        >
                          <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-500" />
                          Share by Email
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate(`/quiz/${id}/submissions`)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                        disabled={status !== 'published'}
                      >
                        <BookOpenIcon className="w-4 h-4 mr-2 text-gray-500" />
                        View Submissions
                      </button>
                    )}
                  </Menu.Item>
                </div>
                
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleDeleteQuiz}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
                      >
                        <TrashIcon className="w-4 h-4 mr-2 text-red-500" />
                        Delete Quiz
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
        
        {/* Modals */}
        <DeleteQuizModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={async () => {
            try {
              await quizzes.deleteQuiz(id);
              toast.success('Quiz deleted successfully');
              if (onStatusChange) {
                onStatusChange();
              }
            } catch (error) {
              logger.error('Error deleting quiz:', error);
              toast.error('Failed to delete quiz');
            }
          }}
        />
        
        <ShareByEmailModal
          isOpen={isShareByEmailModalOpen}
          onClose={() => setIsShareByEmailModalOpen(false)}
          quizTitle={title}
          quizId={id}
          accessCode={parsedSettings?.accessCode || access_code}
        />
      </>
    );
  }
  
  // GRID VIEW
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
                logger.error('Failed to load image:', getCardImageUrl());
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
                <Menu.Button className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </Menu.Button>
                
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg z-10">
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate(`/quiz/${id}/view`)}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                        >
                          <EyeIcon className="w-4 h-4 mr-2 text-gray-500" />
                          View Details
                        </button>
                      )}
                    </Menu.Item>
                    
                    {status === 'published' && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={toggleQuizStatus}
                            disabled={isLoading}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                          >
                            <PauseIcon className="w-4 h-4 mr-2 text-gray-500" />
                            Archive Quiz
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    
                    {status !== 'published' && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={toggleQuizStatus}
                            disabled={isLoading}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                          >
                            <PlayIcon className="w-4 h-4 mr-2 text-gray-500" />
                            Publish Quiz
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    
                    {status === 'published' && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={shareViaEmail}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                          >
                            <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-500" />
                            Share by Email
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate(`/quiz/${id}/submissions`)}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                          disabled={status !== 'published'}
                        >
                          <BookOpenIcon className="w-4 h-4 mr-2 text-gray-500" />
                          View Submissions
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                  
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleDeleteQuiz}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
                        >
                          <TrashIcon className="w-4 h-4 mr-2 text-red-500" />
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
          {/* Card Title */}
          <h3 className="font-semibold text-gray-900 mb-1">
            {capitalizeFirstLetter(title)}
          </h3>
          
          {/* Card Description - Optional */}
          {description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {capitalizeFirstLetter(description)}
            </p>
          )}
          
          {/* Card Stats Grid */}
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
          
          {/* Sharing Section - Only show for published quizzes */}
          {status === 'published' && (parsedSettings?.accessCode || access_code) && (
            <div className="border-t border-gray-100 mt-3 pt-3">
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClipboardDocumentIcon className="w-4 h-4 text-gray-500 mr-1.5" />
                    <span className="text-sm text-gray-800 font-medium">Access Code</span>
                  </div>
                  <button
                    onClick={() => handleCopy('code', parsedSettings?.accessCode || access_code)}
                    className="text-xs text-primary hover:text-primary-dark"
                  >
                    {copied.code ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="mt-1 text-sm font-mono bg-gray-50 p-1.5 rounded border border-gray-200 text-gray-800">
                  <code id={`access-code-${id}`}>
                    {parsedSettings?.accessCode || access_code || 'No access code available'}
                  </code>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <LinkIcon className="w-4 h-4 text-gray-500 mr-1.5" />
                    <span className="text-sm text-gray-800 font-medium">Share Link</span>
                  </div>
                  <button
                    onClick={() => handleCopy('url', getQuizUrl())}
                    className="text-xs text-primary hover:text-primary-dark"
                  >
                    {copied.url ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="mt-1 text-sm font-mono bg-gray-50 p-1.5 rounded border border-gray-200 text-gray-800 truncate">
                  <code>{getQuizUrl() || 'No share URL available'}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteQuizModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={async () => {
          try {
            await quizzes.deleteQuiz(id);
            toast.success('Quiz deleted successfully');
            if (onStatusChange) {
              onStatusChange();
            }
          } catch (error) {
            logger.error('Error deleting quiz:', error);
            toast.error('Failed to delete quiz');
          }
        }}
      />
      
      <ShareByEmailModal
        isOpen={isShareByEmailModalOpen}
        onClose={() => setIsShareByEmailModalOpen(false)}
        quizTitle={title}
        quizId={id}
        accessCode={parsedSettings?.accessCode || access_code}
      />
    </>
  );
};

export default QuizCard;
