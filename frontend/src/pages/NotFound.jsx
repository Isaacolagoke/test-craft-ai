import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-[700px] mx-auto bg-white p-8 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-xl text-slate-600 mb-8">Page not found</p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-[#06545E] hover:bg-[#06545E]/90"
        >
          {isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
        </Link>
      </div>
    </div>
  );
}
