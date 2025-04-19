import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import logoText from '../assets/logo-text.svg'
import { CheckIcon, ChevronUpDownIcon, ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import { Listbox, Transition } from '@headlessui/react';
import Modal from '../components/Modal';
import { getApiUrl, getImageUrl } from '../utils/apiUrl';
import logger from '../utils/logger';

export default function TakeQuiz() {
  const params = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [responses, setResponses] = React.useState({})
  const [timeLeft, setTimeLeft] = React.useState(null)
  const [showIntro, setShowIntro] = React.useState(true)
  const [quizStarted, setQuizStarted] = React.useState(false)
  const [quizSubmitted, setQuizSubmitted] = React.useState(false)
  const [quizResult, setQuizResult] = React.useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)

  // State for file upload error
  const [fileError, setFileError] = useState(null);

  // Create file input reference
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true)
        setError(null)
        
        logger.info('Attempting to fetch quiz with accessCode:', params.accessCode);
        
        if (!params.accessCode) {
          throw new Error('No access code provided');
        }
        
        // Generate a random learner ID if one doesn't exist in sessionStorage
        // This helps track the learner's session without requiring authentication
        if (!sessionStorage.getItem('learner_id')) {
          const randomId = 'learner_' + Math.random().toString(36).substring(2, 15);
          sessionStorage.setItem('learner_id', randomId);
        }
        
        // Use fetch directly without token - ensure no auth check happens
        const response = await fetch(getApiUrl(`/api/quizzes/code/${params.accessCode}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz')
        }

        logger.info('Quiz data received:', data.quiz);

        // Ensure access code is available in quiz settings
        if (data.quiz && data.quiz.settings) {
          setQuiz(data.quiz)
          
          // Set up timer if duration is available
          if (data.quiz.settings.duration) {
            setTimeLeft(data.quiz.settings.duration * 60) // Convert minutes to seconds
          }
        }
      } catch (err) {
        logger.error('Error fetching quiz:', err)
        setError(err.message)
        toast.error('Failed to fetch quiz: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [params.accessCode])

  // Timer effect - only start when quiz has actually started
  React.useEffect(() => {
    if (!timeLeft || !quizStarted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, quizStarted])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAnswer = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // Last question - show confirm dialog
      if (window.confirm('Are you sure you want to submit this quiz?')) {
        handleSubmit()
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const startQuiz = () => {
    setShowIntro(false)
    setQuizStarted(true)
  }

  const handleSubmit = async () => {
    try {
      // Show loading notification
      const loadingToast = toast.loading('Submitting your quiz...')
      
      // Get responses ready for submission
      const formattedResponses = Object.entries(responses).map(([questionId, answer]) => ({
        questionId,
        answer
      }))
      
      // Use the share endpoint with accessCode instead of the quiz ID endpoint
      const response = await fetch(getApiUrl(`/api/quizzes/submit/${params.accessCode}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          responses: formattedResponses,
          timeSpent: (quiz?.settings?.duration || 0) * 60 - timeLeft
        })
      })

      const data = await response.json()
      toast.dismiss(loadingToast)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz')
      }

      toast.success('Quiz submitted successfully!')
      setQuizSubmitted(true)
      setQuizResult(data.result || {
        passed: true,
        score: 80,
        totalQuestions: quiz?.questions?.length || 0,
        correctAnswers: Math.floor((quiz?.questions?.length || 0) * 0.8)
      })
    } catch (err) {
      logger.error('Error submitting quiz:', err)
      toast.error('Failed to submit quiz: ' + err.message)
    }
  }

  const submitQuiz = async () => {
    try {
      setIsLoading(true);
      
      // Get anonymous learner ID from session storage
      const learnerId = sessionStorage.getItem('learner_id') || 'anonymous_learner';
      
      // Format submission data correctly for the API
      const submissionData = {
        quizId: quiz.id,
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer,
          // Include both text and content fields to ensure compatibility
          text: typeof answer === 'string' ? answer : JSON.stringify(answer),
          content: typeof answer === 'string' ? answer : JSON.stringify(answer)
        })),
        learnerId: learnerId, // Include anonymous learner ID for tracking
        metadata: {
          browser: navigator.userAgent,
          submittedAt: new Date().toISOString(),
          timeSpent: timeLeft !== null ? quiz?.settings?.duration * 60 - timeLeft : null
        }
      };
      
      logger.info('Submitting quiz with data:', submissionData);
      
      // Send the submission to the server - using the correct URL format
      const response = await fetch(
        getApiUrl(`/api/quizzes/submit/${params.accessCode}`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submissionData)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Submission error response:', response.status, errorText);
        throw new Error(errorText || 'Failed to submit quiz');
      }
      
      // Handle the response
      const result = await response.json();
      logger.info('Submission result:', result);
      
      // Set quiz as submitted and show results
      setQuizSubmitted(true);
      setQuizResult(result.result || {
        passed: true,
        score: 0,
        totalQuestions: quiz.questions ? quiz.questions.length : 0,
        correctAnswers: 0
      });
      setShowResults(true);
      
      // Clear timer if it's running
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      logger.error('Error submitting quiz:', error);
      toast.error(error.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current question
  const getCurrentQuestion = () => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return null;
    }
    
    const question = quiz.questions[currentQuestionIndex];
    
    logger.info("Raw question data:", question); // For debugging
    logger.info("Options structure:", question.options); // Debug the options structure
    
    // Handle different field naming
    return {
      id: question.id,
      content: question.text || question.content,
      type: question.type,
      options: question.options || [],
      correctAnswer: question.correct_answer || question.correctAnswer,
      items: question.items || question.categories || [], // Categories for matching
      matches: question.matches || question.options || [], // Options for matching
      image: question.image,
      allowMultipleAnswers: question.allowMultipleAnswers || false
    };
  }

  const currentQuestion = getCurrentQuestion();

  return (
    <div className="min-h-screen bg-white">
      {/* Quiz Header - only show if not on results or intro screen */}
      {!quizSubmitted && !showIntro && quiz && !showResults && (
        <>
          <header className="border-b border-gray-100">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex justify-between items-center">
                <img src={logoText} alt="TestCraft" className="h-8" />
                {timeLeft !== null && (
                  <div className="flex items-center text-teal-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>
            </div>
          </header>
          
          {/* Quiz Title and Description */}
          <div className="max-w-3xl mx-auto px-4 py-4">
            <h1 className="text-2xl text-gray-800 font-medium mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-gray-600 mb-4">{quiz.description}</p>
            )}
          </div>
        </>
      )}

      {/* Question Section */}
      {!quizSubmitted && !showIntro && currentQuestion && quiz && !showResults && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Question indicator */}
          <div className="flex items-center space-x-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-700">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600 text-sm">Question {currentQuestionIndex + 1} of {quiz?.questions?.length}</span>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6">{currentQuestion.content}</h2>

            {/* Image if available - support multiple media path formats */}
            {(currentQuestion.image || currentQuestion.mediaUrl) && (
              <div className="mb-6">
                <img 
                  src={getImageUrl(currentQuestion.mediaUrl || currentQuestion.image)} 
                  alt="Question" 
                  className="max-w-full rounded-lg"
                  onError={(e) => {
                    logger.error('Failed to load question image:', currentQuestion.mediaUrl || currentQuestion.image);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Multiple choice options */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-3 mb-8">
                <style>
                  {`
                    input[type="radio"], input[type="checkbox"] {
                      accent-color: #06545E;
                    }
                  `}
                </style>
                <p className="text-sm text-gray-600 mb-2">
                  {currentQuestion.allowMultipleAnswers 
                    ? "Select all answers that apply" 
                    : "Select the best answer"}
                </p>
                {currentQuestion.options.map((option, index) => (
                  <label 
                    key={index} 
                    className={`flex items-center p-4 border border-gray-200 rounded-md cursor-pointer transition-colors ${
                      currentQuestion.allowMultipleAnswers
                        ? (responses[currentQuestion.id] && Array.isArray(responses[currentQuestion.id]) && responses[currentQuestion.id].includes(index))
                          ? 'bg-teal-50 border-teal-700 text-teal-700' 
                          : 'hover:bg-gray-50'
                        : responses[currentQuestion.id] === index 
                          ? 'bg-teal-50 border-teal-700 text-teal-700' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type={currentQuestion.allowMultipleAnswers ? "checkbox" : "radio"}
                      name={`question-${currentQuestion.id}`}
                      value={index}
                      checked={currentQuestion.allowMultipleAnswers
                        ? responses[currentQuestion.id] && Array.isArray(responses[currentQuestion.id]) && responses[currentQuestion.id].includes(index)
                        : responses[currentQuestion.id] === index}
                      onChange={() => {
                        if (currentQuestion.allowMultipleAnswers) {
                          // For multiple answers, toggle the selected option in an array
                          const currentAnswers = responses[currentQuestion.id] || [];
                          let newAnswers;
                          
                          if (currentAnswers.includes(index)) {
                            newAnswers = currentAnswers.filter(a => a !== index);
                          } else {
                            newAnswers = [...currentAnswers, index];
                          }
                          
                          handleAnswer(currentQuestion.id, newAnswers);
                        } else {
                          // For single answer questions
                          handleAnswer(currentQuestion.id, index);
                        }
                      }}
                      className="h-4 w-4 text-teal-700 border-gray-300 focus:ring-teal-700"
                    />
                    <span className="ml-3 text-gray-800">
                      {typeof option === 'object' && option !== null ? option.text : option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Select/Dropdown options */}
            {currentQuestion.type === 'select' && (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  {currentQuestion.allowMultipleAnswers 
                    ? "Select all options that apply" 
                    : "Select the right option"}
                </p>

                {/* Always display this for select type questions */}
                <div className="w-full max-w-xs">
                  <Listbox
                    value={currentQuestion.allowMultipleAnswers ? (responses[currentQuestion.id] || []) : responses[currentQuestion.id]}
                    onChange={(selected) => {
                      if (currentQuestion.allowMultipleAnswers) {
                        handleAnswer(currentQuestion.id, selected);
                      } else {
                        const selectedIndex = currentQuestion.options.indexOf(selected);
                        if (selectedIndex !== -1) {
                          handleAnswer(currentQuestion.id, selectedIndex);
                        }
                      }
                    }}
                    multiple={currentQuestion.allowMultipleAnswers === true}
                  >
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                        <span className="block truncate">
                          {currentQuestion.allowMultipleAnswers 
                            ? (responses[currentQuestion.id] && Array.isArray(responses[currentQuestion.id]) && responses[currentQuestion.id].length > 0
                                ? `${responses[currentQuestion.id].length} selected`
                                : "Select options")
                            : (responses[currentQuestion.id] !== undefined 
                                ? (typeof currentQuestion.options[responses[currentQuestion.id]] === 'object' 
                                    ? currentQuestion.options[responses[currentQuestion.id]].text 
                                    : currentQuestion.options[responses[currentQuestion.id]])
                                : "Select")}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                          {(currentQuestion.options || []).map((option, index) => (
                            <Listbox.Option
                              key={index}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-teal-100 text-teal-900' : 'text-gray-900'
                                }`
                              }
                              value={currentQuestion.allowMultipleAnswers ? index : option}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {typeof option === 'object' && option !== null ? option.text : option}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                        active ? 'text-teal-600' : 'text-teal-600'
                                      }`}
                                    >
                                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>
              </div>
            )}

            {/* True/False options - similar styled as multiple choice */}
            {currentQuestion.type === 'true_false' && (
              <div className="space-y-3 mb-8">
                <style>
                  {`
                    input[type="radio"] {
                      accent-color: #06545E;
                    }
                  `}
                </style>
                <p className="text-sm text-gray-600 mb-2">Select the correct answer</p>
                <label 
                  className={`flex items-center p-4 border border-gray-200 rounded-md cursor-pointer transition-colors ${
                    responses[currentQuestion.id] === 0 
                      ? 'bg-teal-50 border-teal-700 text-teal-700' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="true"
                    checked={responses[currentQuestion.id] === "true" || responses[currentQuestion.id] === 0}
                    onChange={() => handleAnswer(currentQuestion.id, 0)}
                    className="h-4 w-4 text-teal-700 border-gray-300 focus:ring-teal-700"
                  />
                  <span className="ml-3 text-gray-800">True</span>
                </label>
                <label 
                  className={`flex items-center p-4 border border-gray-200 rounded-md cursor-pointer transition-colors ${
                    responses[currentQuestion.id] === 1 
                      ? 'bg-teal-50 border-teal-700 text-teal-700' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="false"
                    checked={responses[currentQuestion.id] === "false" || responses[currentQuestion.id] === 1}
                    onChange={() => handleAnswer(currentQuestion.id, 1)}
                    className="h-4 w-4 text-teal-700 border-gray-300 focus:ring-teal-700"
                  />
                  <span className="ml-3 text-gray-800">False</span>
                </label>
              </div>
            )}
            
            {/* Matching questions */}
            {currentQuestion.type === 'matching' && (
              <>
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Match the cards in the right category</h3>
                  <p className="text-sm text-gray-600">Drag and drop the cards in the right category</p>
                </div>
                
                {/* Initialize responses for matching if not already done */}
                {!responses[currentQuestion.id] && (() => {
                  const initialMatches = {};
                  // Init with all options in unassigned state
                  if (currentQuestion.options && Array.isArray(currentQuestion.options)) {
                    currentQuestion.options.forEach((_, idx) => {
                      initialMatches[`option-${idx}`] = null; // null means unassigned
                    });
                  } else if (currentQuestion.matches && Array.isArray(currentQuestion.matches)) {
                    currentQuestion.matches.forEach((_, idx) => {
                      initialMatches[`option-${idx}`] = null; // null means unassigned
                    });
                  }
                  handleAnswer(currentQuestion.id, initialMatches);
                  return null;
                })()}
                
                {/* Category drop zones */}
                <div className="border rounded-lg mb-6">
                  <div className="grid grid-cols-2 divide-x">
                    {/* Category headers exactly as in screenshot */}
                    <div className="p-4 font-medium">Category 1</div>
                    <div className="p-4 font-medium">Category 2</div>
                  </div>
                  
                  {/* Drop zones */}
                  <div className="grid grid-cols-2 divide-x border-t">
                    {/* Create two drop zones (for simplicity) */}
                    {[0, 1].map((zoneIdx) => (
                      <div
                        key={zoneIdx}
                        className="p-8 min-h-40 flex items-center justify-center text-gray-400"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-gray-50');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-gray-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-gray-50');
                          
                          const optionId = e.dataTransfer.getData('option-id');
                          if (optionId) {
                            // Update the response
                            const newMatches = {...(responses[currentQuestion.id] || {})};
                            newMatches[optionId] = zoneIdx;
                            handleAnswer(currentQuestion.id, newMatches);
                          }
                        }}
                      >
                        {Object.values(responses[currentQuestion.id] || {}).filter(cat => cat === zoneIdx).length === 0 ? (
                          "Drop cards here"
                        ) : (
                          <div className="w-full space-y-2">
                            {responses[currentQuestion.id] && Object.entries(responses[currentQuestion.id]).map(([optionId, assignedZone]) => {
                              if (assignedZone === zoneIdx) {
                                const optionIndex = parseInt(optionId.split('-')[1]);
                                let optionText = "";
                                
                                const option = currentQuestion.options?.[optionIndex] || 
                                              currentQuestion.matches?.[optionIndex];
                                
                                if (typeof option === 'string') {
                                  optionText = option;
                                } else if (option && typeof option === 'object') {
                                  // Use right property for display if it exists
                                  optionText = option.right || option.text || `Option ${optionIndex + 1}`;
                                } else {
                                  optionText = `Option ${optionIndex + 1}`;
                                }
                                
                                return (
                                  <div 
                                    key={optionId}
                                    className="bg-white p-3 rounded border border-gray-200 cursor-move"
                                    draggable="true"
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('option-id', optionId);
                                    }}
                                  >
                                    {optionText}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Divider */}
                <hr className="my-4 border-t border-gray-200" />
                
                {/* Options to drag (renamed from Cards) */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="font-medium mb-3">Options</div>
                  <div className="flex flex-wrap gap-2">
                    {/* Dynamic options from the question data */}
                    {(currentQuestion.options || currentQuestion.matches || []).map((option, index) => {
                      const optionId = `option-${index}`;
                      const isAssigned = responses[currentQuestion.id] && 
                                        responses[currentQuestion.id][optionId] !== null && 
                                        responses[currentQuestion.id][optionId] !== undefined;
                      
                      // Handle the option object that might have left/right properties
                      let optionText = "";
                      if (typeof option === 'string') {
                        optionText = option;
                      } else if (option && typeof option === 'object') {
                        // Use right property for display if it exists (likely the answer part)
                        optionText = option.right || option.text || `Option ${index + 1}`;
                      } else {
                        optionText = `Option ${index + 1}`;
                      }
                      
                      if (!isAssigned) {
                        return (
                          <div 
                            key={index} 
                            className="bg-white py-2 px-4 rounded border border-gray-200 cursor-move inline-flex items-center"
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('option-id', optionId);
                            }}
                          >
                            {/* Proper grid-dot icon as shown in the screenshot */}
                            <svg className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            
                            {/* Display option text safely */}
                            {optionText}
                          </div>
                        );
                      }
                      return null;
                    })}
                    
                    {/* Fallback to display some options if the backend data is empty */}
                    {(!currentQuestion.options || !currentQuestion.options.length) && (!currentQuestion.matches || !currentQuestion.matches.length) && 
                      [1, 2, 3, 4, 5].map((num) => (
                        <div 
                          key={num} 
                          className="bg-white py-2 px-4 rounded border border-gray-200 cursor-move inline-flex items-center"
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('option-id', `option-${num-1}`);
                          }}
                        >
                          {/* Proper grid-dot icon as shown in the screenshot */}
                          <svg className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Option {num}
                        </div>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
            
            {/* Short Answer / Paragraph Question Types */}
            {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'paragraph') && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Describe your answer</p>
                <div className="relative">
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    rows={currentQuestion.type === 'paragraph' ? 6 : 3}
                    placeholder="Your answer"
                    value={responses[currentQuestion.id] || ''}
                    onChange={(e) => {
                      handleAnswer(currentQuestion.id, e.target.value);
                    }}
                  ></textarea>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {responses[currentQuestion.id] ? 
                      responses[currentQuestion.id].trim().split(/\s+/).filter(Boolean).length : 0} words
                  </div>
                </div>
              </div>
            )}
            
            {/* Fill in the Blanks Question */}
            {currentQuestion.type === 'fill_in_blanks' && (
              <div className="space-y-4 mb-8">
                <p className="text-sm text-gray-600 mb-2">Fill in the blanks</p>
                
                {/* Split text by underscores and create input fields */}
                <div className="space-y-4">
                  {currentQuestion.content.split('_').map((part, index, array) => {
                    // Last part doesn't need an input after it
                    if (index === array.length - 1) {
                      return <span key={index}>{part}</span>;
                    }
                    
                    return (
                      <React.Fragment key={index}>
                        <span>{part}</span>
                        <input
                          type="text"
                          className="border-b-2 border-teal-700 mx-1 px-2 py-1 focus:outline-none focus:border-teal-900 text-teal-800 min-w-[100px] w-auto inline-block"
                          value={(responses[currentQuestion.id] || [])[index] || ''}
                          onChange={(e) => {
                            const newResponses = { ...responses };
                            const currentBlankResponses = newResponses[currentQuestion.id] || [];
                            currentBlankResponses[index] = e.target.value;
                            newResponses[currentQuestion.id] = currentBlankResponses;
                            setResponses(newResponses);
                          }}
                          placeholder="Enter answer"
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* File Upload Question Type */}
            {currentQuestion.type === 'file_upload' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">Upload a supported file: PDF, audio, video, or images.</p>
                
                <div className="flex items-center space-x-4">
                  {responses[currentQuestion.id]?.file ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        File: {responses[currentQuestion.id].file.name}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleAnswer(currentQuestion.id, null)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.gif,audio/*,video/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            // Check file size (5MB limit)
                            const fileSize = e.target.files[0].size;
                            const maxSize = 5 * 1024 * 1024; // 5MB
                            if (fileSize > maxSize) {
                              setFileError('File size exceeds 5MB limit');
                              return;
                            }
                            setFileError(null);
                            handleAnswer(currentQuestion.id, { file: e.target.files[0] });
                          }
                        }}
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Upload File (Images, PDF, Audio, Video)
                      </label>
                    </>
                  )}
                </div>
                
                {/* Error message if needed */}
                {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
              </div>
            )}
            
            {/* Keep the existing implementation for other question types */}
            {currentQuestion.type === 'ordering' && (
              <div className="bg-white p-4 mb-8 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-3">
                  Arrange the items in the correct order
                </div>
                
                {/* Initialize responses for ordering if not already done */}
                {!responses[currentQuestion.id] && (() => {
                  // Create initial order (0, 1, 2, 3, ...)
                  const initialOrder = currentQuestion.items?.map((_, i) => i) || [];
                  handleAnswer(currentQuestion.id, initialOrder);
                  return null;
                })()}
                
                <div className="space-y-2">
                  {(responses[currentQuestion.id] || []).map((itemIndex, orderPosition) => (
                    <div 
                      key={orderPosition} 
                      className="flex items-center bg-gray-50 p-3 rounded border border-gray-200 cursor-move"
                    >
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-teal-700 text-white mr-3">
                        {orderPosition + 1}
                      </div>
                      <div>{currentQuestion.items?.[itemIndex]}</div>
                      
                      <div className="ml-auto flex space-x-2">
                        <button
                          type="button"
                          disabled={orderPosition === 0}
                          onClick={() => {
                            if (orderPosition > 0) {
                              const newOrder = [...responses[currentQuestion.id]];
                              [newOrder[orderPosition], newOrder[orderPosition - 1]] = [newOrder[orderPosition - 1], newOrder[orderPosition]];
                              handleAnswer(currentQuestion.id, newOrder);
                            }
                          }}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={orderPosition === (responses[currentQuestion.id]?.length - 1)}
                          onClick={() => {
                            if (orderPosition < responses[currentQuestion.id]?.length - 1) {
                              const newOrder = [...responses[currentQuestion.id]];
                              [newOrder[orderPosition], newOrder[orderPosition + 1]] = [newOrder[orderPosition + 1], newOrder[orderPosition]];
                              handleAnswer(currentQuestion.id, newOrder);
                            }
                          }}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 border rounded-md transition-colors ${
                currentQuestionIndex === 0
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-700/90"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  logger.info("Opening submit confirmation modal");
                  setShowSubmitConfirm(true);
                }}
                className="px-6 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-700/90"
              >
                Submit Quiz
              </button>
            )}
          </div>
          
          {/* Timer display - floating at bottom right (as a backup if header is hidden for any reason) */}
          {timeLeft !== null && (
            <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2 flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      )}

      {/* Keep existing code for loading state */}
      {loading && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-700"></div>
        </div>
      )}

      {/* Keep existing code for error state */}
      {error && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-red-500 text-xl mb-4">Error: {error}</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-teal-700 text-white rounded-md"
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {/* Keep existing code for quiz not found state */}
      {!quiz && !loading && !error && (
        <div className="min-h-screen flex items-center justify-center">
          <div>Quiz not found</div>
        </div>
      )}

      {/* Results Page - Show as a regular page instead of a modal */}
      {showResults && quizSubmitted && quizResult && (
        <div className="min-h-screen bg-gray-50">
          <header className="border-b border-gray-100 bg-white">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex justify-between items-center">
                <img src={logoText} alt="TestCraft" className="h-8" />
              </div>
            </div>
          </header>
          
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full mb-4">
                  {quizResult?.passed ? (
                    <div className="bg-green-100 text-green-600 rounded-full h-full w-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="bg-red-100 text-red-600 rounded-full h-full w-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {quizResult?.passed ? 'Congratulations!' : 'Quiz Results'}
                </h3>
                
                <div className="text-center mb-4">
                  <p className="text-lg font-medium">
                    Score: {quizResult?.score || 0}/{quizResult?.totalQuestions || 0}
                  </p>
                  <p className="text-lg mt-2">
                    {quizResult?.passed ? (
                      <span className="text-green-600 font-medium">You passed!</span>
                    ) : (
                      <span className="text-red-600 font-medium">You did not pass.</span>
                    )}
                  </p>
                </div>
                
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                    <p className="text-blue-800 text-sm">
                      Thank you for completing this quiz. Your responses have been submitted and the instructor will be notified.
                    </p>
                  </div>
                  
                  {/* Since learners don't log in, we're checking if we're in the context of a tutor dashboard */}
                  {window.location.pathname.includes('/dashboard') || 
                   window.location.pathname.includes('/create-quiz') || 
                   window.location.pathname.includes('/view') ? (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="mt-4 px-4 py-2 text-sm bg-teal-700 text-white rounded-md hover:bg-teal-800"
                    >
                      Return to Dashboard
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.close()}
                      className="mt-4 px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Close Window
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <Modal 
        show={showSubmitConfirm} 
        onClose={() => {
          logger.info("Closing submit confirmation modal");
          setShowSubmitConfirm(false);
        }}
      >
        <div className="p-6 bg-white rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Quiz</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to submit this quiz? You won't be able to change your answers afterward.
          </p>
          
          {/* Check if all questions have been answered */}
          {quiz && Object.keys(responses).length < quiz.questions.length && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                You have {quiz.questions.length - Object.keys(responses).length} unanswered questions.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                logger.info("Cancelled submission");
                setShowSubmitConfirm(false);
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                logger.info("Confirmed submission, calling submitQuiz");
                setShowSubmitConfirm(false);
                submitQuiz();
              }}
              className="px-4 py-2 text-sm bg-teal-700 text-white rounded-md hover:bg-teal-800"
            >
              Submit
            </button>
          </div>
        </div>
      </Modal>

      {/* Intro screen */}
      {showIntro && quiz && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-8">
            <div className="aspect-video w-full rounded-lg overflow-hidden mb-8 bg-gray-200">
              {quiz.image_url || quiz.imageUrl || (quiz.settings && quiz.settings.imageUrl) ? (
                <img 
                  src={getImageUrl(quiz.image_url || quiz.imageUrl || quiz.settings.imageUrl)} 
                  alt={quiz.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    logger.error('Failed to load quiz image:', quiz.image_url || quiz.imageUrl || quiz.settings.imageUrl);
                    e.target.src = 'https://placehold.co/600x400?text=Quiz+Image';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-center mb-4">
              Hey, {quiz.creator_name || 'Someone'}'s inviting you to join a quiz!
            </h1>
            
            <p className="text-center text-gray-700 mb-8">
              {quiz.description || 'Why not give this quiz a shot?'}
            </p>
            
            <div className="flex justify-center gap-4 text-gray-600 mb-8">
              <div className="flex items-center">
                <span className="mr-2">{quiz.questions?.length} questions</span>
              </div>
              <div className="flex items-center">
                <span>{quiz.settings?.duration || '10'} {quiz.settings?.timeUnit || 'minutes'}</span>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={startQuiz}
                className="px-6 py-3 bg-teal-700 text-white rounded-md hover:bg-teal-700/90 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Let's Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}