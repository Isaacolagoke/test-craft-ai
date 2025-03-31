import React from 'react'

export default function QuizPreview({ quiz }) {
  // Function to get image from multiple possible sources
  const getImageUrl = () => {
    // Check all possible image sources including settings
    const imageUrlToUse = quiz.image_url || 
                   quiz.imageUrl || 
                   quiz.image || 
                   (quiz.settings && quiz.settings.imageUrl) || 
                   null;
    
    // If it's a relative URL that starts with /uploads, make it absolute
    if (imageUrlToUse && typeof imageUrlToUse === 'string' && imageUrlToUse.startsWith('/uploads')) {
      return `http://localhost:3001${imageUrlToUse}`;
    }
    
    // Add console log to debug
    console.log('Preview Image URL used:', imageUrlToUse);
    return imageUrlToUse;
  };

  // Get quiz settings, handling both direct properties and nested settings
  const settings = quiz.settings || {};
  
  return (
    <div className="space-y-8">
      {/* Quiz Header */}
      <div className="space-y-4">
        {getImageUrl() && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden">
            <img 
              src={getImageUrl()} 
              alt={quiz.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Failed to load image:", getImageUrl());
                // Provide a fallback image instead of hiding
                e.target.src = 'https://placehold.co/600x400?text=Quiz+Image';
              }}
            />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{quiz.title}</h1>
          <p className="mt-2 text-slate-600">{quiz.description}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">Duration:</span>
            <span>{settings.duration || quiz.timeLimit} {settings.timeUnit || quiz.timeUnit || 'minutes'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Difficulty:</span>
            <span className="capitalize">{settings.complexity || quiz.complexity || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Category:</span>
            <span>{quiz.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Questions:</span>
            <span>{quiz.questions.length}</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions.map((question, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Question {index + 1}</h3>
              <span className="text-sm text-slate-500 capitalize">{question.type.replace(/_/g, ' ')}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-slate-900">{question.content}</p>
                </div>
                {question.mediaUrl && (
                  <div className="w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={question.mediaUrl} 
                      alt="Question media" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Multiple Choice or Dropdown Options */}
              {(question.type === 'multiple_choice' || question.type === 'dropdown') && (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-start gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="radio"
                          checked={typeof option === 'object' ? option.isCorrect : question.correctAnswer === optionIndex}
                          readOnly
                          className="w-4 h-4 text-[#06545E] border-slate-300"
                        />
                        <span className={`text-slate-900 ${
                          (typeof option === 'object' ? option.isCorrect : question.correctAnswer === optionIndex) ? 'font-medium' : ''
                        }`}>{typeof option === 'object' ? option.text : option}</span>
                      </div>
                      {option.mediaUrl && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={option.mediaUrl} 
                            alt={`Option ${optionIndex + 1} media`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* True/False Options */}
              {question.type === 'true_false' && (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={question.correctAnswer === optionIndex}
                        readOnly
                        className="w-4 h-4 text-[#06545E] border-slate-300"
                      />
                      <span className={`text-slate-900 ${
                        question.correctAnswer === optionIndex ? 'font-medium' : ''
                      }`}>{typeof option === 'object' ? option.text : option}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Paragraph Answer */}
              {question.type === 'paragraph' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Sample Answer:</h4>
                  <p className="text-slate-600 bg-slate-50 p-4 rounded-lg">{question.correctAnswer}</p>
                </div>
              )}

              {/* Matching Pairs */}
              {question.type === 'matching' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {question.options.map((pair, pairIndex) => (
                      <div key={pairIndex} className="p-3 bg-slate-50 rounded-lg">
                        {pair.left}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {question.options.map((pair, pairIndex) => (
                      <div key={pairIndex} className="p-3 bg-slate-50 rounded-lg">
                        {pair.right}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fill in the Blank */}
              {question.type === 'fill_in_blank' && (
                <div className="space-y-3">
                  <p className="text-slate-900">{question.content}</p>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Answers:</h4>
                    <div className="flex flex-wrap gap-2">
                      {question.correctAnswer.map((answer, answerIndex) => (
                        <span key={answerIndex} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                          {answer}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {question.type === 'file_upload' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Allowed Files:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                      Types: {question.options[0]}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                      Max Size: {question.options[1]}MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 