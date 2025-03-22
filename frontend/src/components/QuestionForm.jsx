import React, { Fragment } from 'react'
import { 
  TrashIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  DocumentIcon,
  ChevronUpDownIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Switch, Listbox } from '@headlessui/react'
import cloudUploadIcon from '../assets/cloud-upload.svg'

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'true_false', label: 'True/False' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'matching', label: 'Matching' },
  { id: 'fill_in_blanks', label: 'Fill in the Blanks' },
  { id: 'file_upload', label: 'File Upload' },
  { id: 'dropdown', label: 'Dropdown' }
]

export default function QuestionForm({ 
  question, 
  onChange, 
  onDelete,
  questionNumber 
}) {
  const [showDelete, setShowDelete] = React.useState(false)
  const [isRequired, setIsRequired] = React.useState(true)
  const [allowMultipleAnswers, setAllowMultipleAnswers] = React.useState(false)

  const handleMediaUpload = async (file, type, index = null) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('http://localhost:3001/api/quizzes/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      if (data.success) {
        if (type === 'question') {
          onChange({
            ...question,
            mediaUrl: data.imageUrl
          })
        } else if (type === 'option' && index !== null) {
          const newOptions = [...question.options]
          newOptions[index] = {
            ...newOptions[index],
            mediaUrl: data.imageUrl
          }
          onChange({
            ...question,
            options: newOptions
          })
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      // You might want to show a toast notification here
    }
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options]
    if (typeof value === 'object') {
      newOptions[index] = value
    } else {
      // If the value is a string, convert it to an object with text and isCorrect properties
      newOptions[index] = {
        text: value,
        isCorrect: Array.isArray(question.correctAnswer) 
          ? question.correctAnswer.includes(index)
          : question.correctAnswer === index
      }
    }
    onChange({
      ...question,
      options: newOptions
    })
  }

  const handleAddOption = () => {
    onChange({
      ...question,
      options: [...question.options, {
        text: '',
        isCorrect: false
      }]
    })
  }

  const handleRemoveOption = (index) => {
    const newOptions = question.options.filter((_, i) => i !== index)
    onChange({
      ...question,
      options: newOptions,
      correctAnswer: Array.isArray(question.correctAnswer) 
        ? question.correctAnswer.filter(i => i !== index)
        : question.correctAnswer > index 
          ? question.correctAnswer - 1 
          : question.correctAnswer
    })
  }

  const handleCorrectAnswerChange = (index) => {
    const newOptions = [...question.options]
    if (allowMultipleAnswers) {
      // For multiple answers, toggle isCorrect for the selected option
      newOptions[index] = {
        ...newOptions[index],
        isCorrect: !newOptions[index].isCorrect
      }
      onChange({
        ...question,
        options: newOptions
      })
    } else {
      // For single answer, set isCorrect to true for selected option and false for others
      newOptions.forEach((opt, i) => {
        newOptions[i] = {
          ...opt,
          isCorrect: i === index
        }
      })
      onChange({
        ...question,
        options: newOptions,
        correctAnswer: index
      })
    }
  }

  const handleTypeChange = (newType) => {
    let updatedQuestion = {
      ...question,
      type: newType,
      content: question.content || '',  // Ensure content is initialized
    }

    // Reset options and correct answer based on type
    switch(newType) {
      case 'true_false':
        updatedQuestion.options = ['True', 'False']
        updatedQuestion.correctAnswer = 0
        break
      case 'multiple_choice':
        updatedQuestion.options = ['', '']
        updatedQuestion.correctAnswer = 0
        break
      case 'paragraph':
        updatedQuestion.options = []
        updatedQuestion.correctAnswer = ''
        break
      case 'matching':
        updatedQuestion.options = [
          { left: '', right: '' },
          { left: '', right: '' }
        ]
        updatedQuestion.correctAnswer = [0, 1]
        break
      case 'fill_in_blanks':
        updatedQuestion.options = []
        updatedQuestion.correctAnswer = []
        break
      case 'file_upload':
        updatedQuestion.options = ['.pdf,.doc,.docx', '5'] // Default allowed types and 5MB limit
        updatedQuestion.correctAnswer = ''
        break
      case 'dropdown':
        updatedQuestion.options = ['']
        updatedQuestion.correctAnswer = 0
        break
      default:
        break
    }

    onChange(updatedQuestion)
  }

  // Helper function to get blank positions from text
  const getBlankPositions = (text = '') => {
    const positions = []
    let pos = text.indexOf('_')
    while (pos !== -1) {
      positions.push(pos)
      pos = text.indexOf('_', pos + 1)
    }
    return positions
  }

  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900">Question {questionNumber}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isRequired}
              onChange={setIsRequired}
              className={`${
                isRequired ? 'bg-[#06545E]' : 'bg-slate-200'
              } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:ring-offset-2`}
            >
              <span
                className={`${
                  isRequired ? 'translate-x-4' : 'translate-x-1'
                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm text-slate-600">Required</span>
          </div>
          {showDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Question Type */}
        <div className="flex items-center gap-2">
          <Listbox value={question.type || 'multiple_choice'} onChange={handleTypeChange}>
            <div className="relative w-fit min-w-[200px]">
              <Listbox.Button className="relative w-full bg-slate-50 text-left text-slate-900 px-4 py-2.5 pr-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent">
                <span className="block truncate">
                  {QUESTION_TYPES.find(t => t.id === (question.type || 'multiple_choice'))?.label}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {QUESTION_TYPES.map((type) => (
                  <Listbox.Option
                    key={type.id}
                    value={type.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-[#06545E] text-white' : 'text-slate-900'
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {type.label}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-[#06545E]'
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
            </div>
          </Listbox>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600"
            title="Learn more about question types"
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Question Content */}
        <div className="space-y-4">
          <label className="block text-base font-medium text-slate-900">
            Question
          </label>
          <div className="grid grid-cols-[7fr,3fr] gap-4">
            <textarea
              value={question.content || ''}
              onChange={(e) => onChange({ ...question, content: e.target.value })}
              placeholder="Enter your question here..."
              className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent resize-none"
              required
            />
            <label className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-4 hover:border-[#06545E] transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleMediaUpload(file, 'question')
                }}
              />
              {question.mediaUrl ? (
                <>
                  <img 
                    src={question.mediaUrl} 
                    alt="Question media" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      onChange({ ...question, mediaUrl: null })
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-slate-50"
                  >
                    <XMarkIcon className="w-4 h-4 text-slate-600" />
                  </button>
                </>
              ) : (
                <>
                  <img src={cloudUploadIcon} alt="Upload" className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-600 text-center">Add media files</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Question Options */}
        {question.type === 'multiple_choice' || question.type === 'dropdown' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-900">Question Options</h4>
              <div className="flex items-center gap-2">
                <Switch
                  checked={allowMultipleAnswers}
                  onChange={setAllowMultipleAnswers}
                  className={`${
                    allowMultipleAnswers ? 'bg-[#06545E]' : 'bg-slate-200'
                  } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      allowMultipleAnswers ? 'translate-x-4' : 'translate-x-1'
                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-slate-600">Allow multiple answers</span>
              </div>
            </div>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div key={index} className="grid grid-cols-[auto,1fr] gap-4 items-start">
                  <span className="text-sm font-medium text-slate-400 pt-2.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={typeof option === 'object' ? option.text : option}
                      onChange={(e) => handleOptionChange(index, typeof option === 'object' ? { ...option, text: e.target.value } : e.target.value)}
                      placeholder="Add option here"
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type={allowMultipleAnswers ? "checkbox" : "radio"}
                        name={`correct-${questionNumber}`}
                        checked={typeof option === 'object' ? option.isCorrect : (Array.isArray(question.correctAnswer) 
                          ? question.correctAnswer.includes(index)
                          : question.correctAnswer === index)}
                        onChange={() => handleCorrectAnswerChange(index)}
                        className="w-4 h-4 text-[#06545E] focus:ring-[#06545E] border-slate-300 rounded accent-[#06545E]"
                      />
                      <span className="text-sm text-slate-600">Mark as correct answer</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Option
            </button>
          </div>
        ) : null}

        {/* True/False Question */}
        {question.type === 'true_false' && (
          <div className="space-y-4">
            <h4 className="text-base font-medium text-slate-900">Select Correct Answer</h4>
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${questionNumber}`}
                    checked={question.correctAnswer === index}
                    onChange={() => handleCorrectAnswerChange(index)}
                    className="w-4 h-4 text-[#06545E] focus:ring-[#06545E] border-slate-300 accent-[#06545E]"
                  />
                  <span className="text-slate-900">{typeof option === 'object' ? option.text : option}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paragraph Question */}
        {question.type === 'paragraph' && (
          <div className="space-y-4">
            <h4 className="text-base font-medium text-slate-900">Sample Answer</h4>
            <textarea
              value={question.correctAnswer || ''}
              onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
              placeholder="Enter a sample answer that would be considered correct"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent resize-none"
              required
            />
            <p className="text-sm text-slate-500">
              This will be used as a reference for grading. Students' answers will be compared against this.
            </p>
          </div>
        )}

        {/* Matching Question */}
        {question.type === 'matching' && (
          <div className="space-y-4">
            <h4 className="text-base font-medium text-slate-900">Matching Pairs</h4>
            <div className="space-y-3">
              {question.options.map((pair, index) => (
                <div key={index} className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      const newOptions = [...question.options]
                      newOptions[index] = { ...pair, left: e.target.value }
                      onChange({ ...question, options: newOptions })
                    }}
                    placeholder="Left item"
                    className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent"
                    required
                  />
                  <div className="w-8 h-[2px] bg-slate-200" />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const newOptions = [...question.options]
                      newOptions[index] = { ...pair, right: e.target.value }
                      onChange({ ...question, options: newOptions })
                    }}
                    placeholder="Right item"
                    className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent"
                    required
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const newOptions = [...question.options, { left: '', right: '' }]
                onChange({
                  ...question,
                  options: newOptions,
                  correctAnswer: [...question.correctAnswer, newOptions.length - 1]
                })
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Pair
            </button>
          </div>
        )}

        {/* Fill in the Blank Question */}
        {question.type === 'fill_in_blanks' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Use underscore (_) to mark blank spaces</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-base font-medium text-slate-900">Answers for Blanks</h4>
              {getBlankPositions(question.text).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600 min-w-[80px]">
                    Blank {index + 1}:
                  </span>
                  <input
                    type="text"
                    value={question.correctAnswer[index] || ''}
                    onChange={(e) => {
                      const newAnswers = [...question.correctAnswer]
                      newAnswers[index] = e.target.value
                      onChange({ ...question, correctAnswer: newAnswers })
                    }}
                    placeholder={`Answer for blank ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#06545E] focus:border-transparent"
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Upload Question */}
        {question.type === 'file_upload' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-base font-medium text-slate-900 mb-2">File Upload Requirements</h4>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Allowed File Types:</span> PDF, DOC, DOCX
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Maximum File Size:</span> 5MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 