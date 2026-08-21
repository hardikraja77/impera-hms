import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DASHBOARDS = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
};

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page Not Found</p>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3">
          {user ? (
            <Link
              to={ROLE_DASHBOARDS[user.role] || '/'}
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
