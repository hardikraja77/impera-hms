import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DASHBOARDS = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
};

const ROLE_LOGIN = {
  admin: '/admin-login',
  doctor: '/doctor-login',
  receptionist: '/receptionist-login',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to home
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Logged in but wrong role — show access denied with option to go to correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const correctDashboard = ROLE_DASHBOARDS[user.role] || '/';
    const correctLogin = ROLE_LOGIN[user.role] || '/';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
            <br />
            <span className="text-sm text-gray-500">
              You are logged in as <strong className="capitalize">{user.role}</strong> ({user.email})
            </span>
          </p>
          <div className="space-y-3">
            <a
              href={correctDashboard}
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
            </a>
            <a
              href="/"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
