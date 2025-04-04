import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This component handles redirects from the 404.html page
export default function RouterFallback() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if we have a redirect path stored from 404.html
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      // Clear it from storage
      sessionStorage.removeItem('redirectPath');
      // Navigate to that path
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);
  
  return null; // This component doesn't render anything
}
