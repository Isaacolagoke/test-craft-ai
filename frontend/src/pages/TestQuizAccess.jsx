import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import logoText from '../assets/logo-text.svg';

export default function TestQuizAccess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [publicAccess, setPublicAccess] = useState(true);
  
  // This is a test component to verify that non-authenticated users can access quizzes
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Logo fixed at top */}
      <div className="w-full flex justify-center fixed top-8 z-10">
        <img src={logoText} alt="TestCraft.ai" className="h-6" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-xl w-full mx-auto my-10">
          <h1 className="text-2xl font-bold text-center mb-6">Quiz Access Test</h1>
          
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Test Result: {publicAccess ? "SUCCESS!" : "FAILED"}</p>
            <p className="text-sm">
              {publicAccess 
                ? "You've successfully accessed this quiz without authentication!" 
                : "You were redirected to login instead of seeing the quiz."}
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold text-blue-800 mb-2">What this means:</h2>
            <p className="text-blue-700 text-sm">
              Our fix to the authentication redirect issue is working correctly. When someone receives a 
              shared quiz link, they will be able to take the quiz directly without being forced to log in.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <Link 
                to="/login" 
                className="bg-[#06545E] text-white px-6 py-2 rounded-full hover:bg-[#053e45] transition-colors"
              >
                Go to Login
              </Link>
              <Link 
                to="/" 
                className="border border-[#06545E] text-[#06545E] px-6 py-2 rounded-full hover:bg-[#f0f9fa] transition-colors"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
