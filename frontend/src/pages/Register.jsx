import React from 'react';
import logoText from '../assets/logo-text.svg';
import google from '../assets/google.svg';

function Register() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-container py-8">
      <div className="w-full max-w-container space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoText} alt="TestCraft.ai" className="h-8" />
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-text-secondary">Harness the power of AI to create faster tests</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Name"
                className="w-full h-input px-4 rounded-full border border-border focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Your password"
                className="w-full h-input px-4 rounded-full border border-border focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Email address"
                className="w-full h-input px-4 rounded-full border border-border focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-button bg-primary text-white rounded-full hover:bg-opacity-90 transition-colors"
          >
            Continue
          </button>
        </form>

        {/* Login link */}
        <div className="text-center">
          <p className="text-text-secondary">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:underline">
              Log in
            </a>
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-text-secondary">or</span>
          </div>
        </div>

        {/* Social login */}
        <button
          type="button"
          className="w-full h-button flex items-center justify-center gap-2 border border-border rounded-full hover:bg-hover transition-colors"
        >
          <img src={google} alt="Google" className="h-5 w-5" />
          <span className="text-text-primary">Continue with Google</span>
        </button>
      </div>
    </div>
  );
}

export default Register; 