import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AUTOSAVE_DELAY = 30000; // 30 seconds

export const useQuizForm = (initialData = null) => {
  const [formData, setFormData] = useState(() => {
    // Try to load saved draft
    const savedDraft = localStorage.getItem('quizDraft');
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (err) {
        console.error('Error loading quiz draft:', err);
      }
    }
    return initialData || {
      title: '',
      description: '',
      timeLimit: '',
      timeUnit: 'minutes',
      complexity: 'intermediate',
      category: 'General',
      questions: [],
      image: null,
      numberOfQuestions: 5,
      selectedQuestionTypes: ['multiple_choice', 'true_false'],
      settings: {
        shuffle: false,
        passMark: 60,
        autoGrade: true,
        showAnswers: false,
        allowReview: true,
        showTimer: true,
        showProgress: true,
        attemptsAllowed: 1,
        requireCamera: false,
        blockTabSwitch: false,
        showFeedback: true
      }
    };
  });

  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Autosave functionality
  useEffect(() => {
    if (!isDirty) return;

    const saveTimer = setTimeout(() => {
      localStorage.setItem('quizDraft', JSON.stringify(formData));
      setLastSaved(new Date());
      toast.success('Draft saved automatically');
      setIsDirty(false);
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(saveTimer);
  }, [formData, isDirty]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    if (formData.questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }

    formData.questions.forEach((question, index) => {
      if (!question.content) {
        newErrors[`question_${index}`] = 'Question content is required';
      }
      if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        newErrors[`question_${index}_options`] = 'At least two options are required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
  };

  // Handle question changes
  const handleQuestionChange = (index, updatedQuestion) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? updatedQuestion : q)
    }));
    setIsDirty(true);
  };

  // Handle settings changes
  const handleSettingsChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [name]: value
      }
    }));
    setIsDirty(true);
  };

  // Clear form
  const clearForm = () => {
    localStorage.removeItem('quizDraft');
    setFormData(initialData);
    setErrors({});
    setIsDirty(false);
    setLastSaved(null);
  };

  return {
    formData,
    errors,
    isDirty,
    lastSaved,
    handleChange,
    handleQuestionChange,
    handleSettingsChange,
    validateForm,
    clearForm,
    setFormData
  };
};
