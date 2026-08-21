import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const roleConfig = {
  admin: {
    title: 'Admin Login',
    color: 'bg-gray-800 hover:bg-gray-900',
    accent: 'text-gray-800',
    description: 'Access the admin dashboard to manage the system.',
  },
  doctor: {
    title: 'Doctor Login',
    color: 'bg-blue-600 hover:bg-blue-700',
    accent: 'text-blue-600',
    description: 'Access your consultation dashboard.',
  },
  receptionist: {
    title: 'Receptionist Login',
    color: 'bg-emerald-600 hover:bg-emerald-700',
    accent: 'text-emerald-600',
    description: 'Manage patient registration and appointments.',
  },
};

function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return '';
}

function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
}

export default function LoginPage({ role }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const config = roleConfig[role];

  const validate = () => {
    const errors = {};
    errors.email = validateEmail(email);
    errors.password = validatePassword(password);
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = {};
    if (field === 'email') errors.email = validateEmail(email);
    if (field === 'password') errors.password = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true });

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password, role);
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-3xl font-bold">H</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{config.title}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {config.description}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur('email')}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                  touched.email && fieldErrors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="you@example.com"
              />
              {touched.email && fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center space-x-1">
                  <span>•</span>
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur('password')}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                  touched.password && fieldErrors.password
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Enter password"
              />
              {touched.password && fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center space-x-1">
                  <span>•</span>
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${config.color} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all`}
              >
                {loading && <Spinner />}
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center text-sm text-gray-500">
              <Link to="/" className={`${config.accent} hover:underline font-medium`}>
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
