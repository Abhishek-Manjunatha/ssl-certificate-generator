import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Navigation Bar */}
      <div className="w-full flex justify-between items-center px-4 py-2 bg-white shadow-sm mb-4">
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline font-medium">Back</button>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline font-medium">Home</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          <button onClick={() => navigate('/')} className="text-blue-500 hover:text-blue-700 underline text-lg font-medium">Return to Home</button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
