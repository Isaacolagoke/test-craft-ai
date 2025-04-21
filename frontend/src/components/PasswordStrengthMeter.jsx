import React from 'react';

const PasswordStrengthMeter = ({ password }) => {
  // Password requirements
  const requirements = [
    { 
      id: 'length', 
      label: 'At least 8 characters', 
      isValid: password.length >= 8 
    },
    { 
      id: 'uppercase', 
      label: 'At least one uppercase letter', 
      isValid: /[A-Z]/.test(password) 
    },
    { 
      id: 'lowercase', 
      label: 'At least one lowercase letter', 
      isValid: /[a-z]/.test(password) 
    },
    { 
      id: 'number', 
      label: 'At least one number', 
      isValid: /\d/.test(password) 
    },
    { 
      id: 'special', 
      label: 'At least one special character', 
      isValid: /[!@#$%^&*(),.?":{}|<>]/.test(password) 
    }
  ];

  // Calculate password strength (0-100)
  const calculateStrength = () => {
    // Count valid requirements
    const validCount = requirements.filter(req => req.isValid).length;
    return (validCount / requirements.length) * 100;
  };

  const strength = calculateStrength();
  const allValid = requirements.every(req => req.isValid);
  
  // Determine color based on strength
  const getStrengthColor = () => {
    if (strength <= 20) return 'bg-red-500';
    if (strength <= 40) return 'bg-orange-500';
    if (strength <= 60) return 'bg-yellow-500';
    if (strength <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Only show when user starts typing a password
  if (password.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 mb-4 text-sm">
      {/* Password strength meter */}
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full ${getStrengthColor()} transition-all duration-300 ease-in-out`}
          style={{ width: `${strength}%` }}
        ></div>
      </div>
      
      {/* Password strength label */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-600">Password strength:</span>
        <span className={`font-medium ${
          strength <= 40 ? 'text-red-500' : 
          strength <= 60 ? 'text-yellow-500' : 
          strength <= 80 ? 'text-blue-500' : 
          'text-green-500'
        }`}>
          {strength <= 20 ? 'Very weak' : 
           strength <= 40 ? 'Weak' : 
           strength <= 60 ? 'Medium' : 
           strength <= 80 ? 'Strong' : 
           'Very strong'}
        </span>
      </div>
      
      {/* Requirements list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {requirements.map(req => (
          <div key={req.id} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center
              ${req.isValid 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'}`}
            >
              {req.isValid ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={req.isValid ? 'text-slate-700' : 'text-slate-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
