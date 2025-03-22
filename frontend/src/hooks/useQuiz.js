import { useState, useEffect, useCallback } from 'react';
import { quizzes } from '../api';
import { toast } from 'react-hot-toast';

export const useQuiz = (quizId = null) => {
  const [quiz, setQuiz] = useState(null);
  const [quizzesList, setQuizzesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch single quiz
  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      const response = await quizzes.getById(quizId);
      setQuiz(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError(err.response?.data?.error || 'Failed to fetch quiz');
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Fetch all quizzes
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await quizzes.getAll();
      setQuizzesList(response.data.quizzes);
      setError(null);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError(err.response?.data?.error || 'Failed to fetch quizzes');
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create quiz
  const createQuiz = async (quizData) => {
    try {
      setSaving(true);
      const response = await quizzes.create(quizData);
      toast.success('Quiz created successfully');
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error creating quiz:', err);
      toast.error(err.response?.data?.error || 'Failed to create quiz');
      return { success: false, error: err.response?.data?.error };
    } finally {
      setSaving(false);
    }
  };

  // Update quiz
  const updateQuiz = async (id, data) => {
    try {
      setSaving(true);
      const response = await quizzes.update(id, data);
      setQuiz(response.data);
      toast.success('Quiz updated successfully');
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error updating quiz:', err);
      toast.error(err.response?.data?.error || 'Failed to update quiz');
      return { success: false, error: err.response?.data?.error };
    } finally {
      setSaving(false);
    }
  };

  // Delete quiz
  const deleteQuiz = async (id) => {
    try {
      await quizzes.delete(id);
      setQuizzesList(prev => prev.filter(q => q.id !== id));
      toast.success('Quiz deleted successfully');
    } catch (err) {
      console.error('Error deleting quiz:', err);
      toast.error(err.response?.data?.error || 'Failed to delete quiz');
    }
  };

  // Publish quiz
  const publishQuiz = async (id) => {
    try {
      const response = await quizzes.publish(id);
      setQuiz(response.data);
      toast.success('Quiz published successfully');
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error publishing quiz:', err);
      toast.error(err.response?.data?.error || 'Failed to publish quiz');
      return { success: false, error: err.response?.data?.error };
    }
  };

  // Pause/Resume quiz
  const pauseQuiz = async (id) => {
    try {
      const quiz = quizzesList.find(q => q.id === id);
      const action = quiz.status === 'paused' ? 'resume' : 'pause';
      const response = await quizzes[action](id);
      setQuizzesList(prev => prev.map(q => 
        q.id === id ? { ...q, status: response.data.status } : q
      ));
      toast.success(`Quiz ${action}d successfully`);
    } catch (err) {
      console.error('Error updating quiz status:', err);
      toast.error(err.response?.data?.error || `Failed to ${action} quiz`);
    }
  };

  // Toggle responses
  const toggleResponses = async (id) => {
    try {
      const quiz = quizzesList.find(q => q.id === id);
      if (!quiz) return;

      const newState = !quiz.isAcceptingResponses;
      
      // Optimistically update UI
      setQuizzesList(prev => prev.map(q => 
        q.id === id ? { ...q, isAcceptingResponses: newState } : q
      ));
      
      // Call API
      const response = await quizzes.updateStatus(id, { isAcceptingResponses: newState });
      
      // Update with server response
      setQuizzesList(prev => prev.map(q => 
        q.id === id ? { ...q, isAcceptingResponses: response.data.isAcceptingResponses } : q
      ));
      
      toast.success(
        response.data.isAcceptingResponses 
          ? 'Quiz is now accepting responses' 
          : 'Quiz is no longer accepting responses'
      );
    } catch (err) {
      // Revert on error
      setQuizzesList(prev => prev.map(q => 
        q.id === id ? { ...q, isAcceptingResponses: !q.isAcceptingResponses } : q
      ));
      console.error('Error toggling quiz responses:', err);
      toast.error('Failed to update quiz status');
    }
  };

  // Generate questions
  const generateQuestions = async (params) => {
    try {
      setLoading(true);
      const response = await quizzes.generateQuestions(params);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error generating questions:', err);
      toast.error(err.response?.data?.error || 'Failed to generate questions');
      return { success: false, error: err.response?.data?.error };
    } finally {
      setLoading(false);
    }
  };

  // Upload image
  const uploadImage = async (formData) => {
    try {
      const response = await quizzes.uploadImage(formData);
      return { success: true, imageUrl: response.data.imageUrl };
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error(err.response?.data?.error || 'Failed to upload image');
      return { success: false, error: err.response?.data?.error };
    }
  };

  // Load quiz data if ID is provided
  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    } else {
      fetchQuizzes();
    }
  }, [quizId, fetchQuiz, fetchQuizzes]);

  return {
    quiz,
    quizzes: quizzesList,
    loading,
    error,
    saving,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    publishQuiz,
    pauseQuiz,
    toggleResponses,
    generateQuestions,
    uploadImage,
    refreshQuiz: fetchQuiz,
    refreshQuizzes: fetchQuizzes
  };
};
