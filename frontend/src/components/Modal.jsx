import React from 'react';

// Simple Modal without using Headless UI
export default function Modal({ show, onClose, children }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        ></div>
        
        {/* Modal content */}
        <div className="inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-20">
          {children}
        </div>
      </div>
    </div>
  );
}
