import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await auth.verify();
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await auth.login(credentials);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    }
  };

  const register = async (data) => {
    try {
      const response = await auth.register(data);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Registration failed'
      };
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
