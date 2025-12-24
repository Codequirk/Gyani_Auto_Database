import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Button, Input, ErrorAlert, Card } from '../components/UI';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      login(response.data.admin, response.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.registerAdmin({
        name: registerName,
        email,
        password,
        role: 'ADMIN',
      });
      login(response.data.admin, response.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Admin Panel</h1>
        
        {error && <ErrorAlert message={error} />}

        {!showRegister ? (
          <form onSubmit={handleLogin}>
            <Input
              type="email"
              placeholder="Email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <p className="text-center text-sm text-gray-600 mt-4">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="text-blue-600 hover:underline"
              >
                Register
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <Input
              type="text"
              placeholder="Name"
              label="Full Name"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="text-blue-600 hover:underline"
              >
                Login
              </button>
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t text-sm text-gray-600">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Email: pragna@company.com</p>
          <p>Password: Test1234</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
