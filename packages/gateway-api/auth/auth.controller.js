import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, generateRefreshToken, verifyToken } from '../middleware/auth.middleware.js';
import { authConfig } from '../config/auth.config.js';

// In-memory user store (replace with database in production)
const users = new Map();
const refreshTokens = new Set();

// Demo users for testing
users.set('admin@example.com', {
  id: '1',
  email: 'admin@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeL0h4SJlvT5PzZzS', // password: admin123
  roles: ['admin'],
  permissions: ['*'],
  createdAt: new Date(),
});

users.set('user@example.com', {
  id: '2',
  email: 'user@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeL0h4SJlvT5PzZzS', // password: user123
  roles: ['user'],
  permissions: ['read:comments', 'write:comments', 'read:profile', 'write:profile'],
  createdAt: new Date(),
});

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    // Check if user already exists
    if (users.has(email)) {
      return res.status(409).json({
        error: 'User exists',
        message: 'User with this email already exists',
      });
    }

    // Validate password strength
    if (password.length < authConfig.password.minLength) {
      return res.status(400).json({
        error: 'Weak password',
        message: `Password must be at least ${authConfig.password.minLength} characters long`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, authConfig.password.saltRounds);

    // Create user
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      roles: [role],
      permissions: authConfig.roles[role]?.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.set(email, newUser);

    // Generate tokens
    const accessToken = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    refreshTokens.add(refreshToken);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error during registration',
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error during login',
    });
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required',
      });
    }

    // Check if refresh token exists
    if (!refreshTokens.has(token)) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid or expired refresh token',
      });
    }

    try {
      // Verify refresh token
      const payload = verifyToken(token);
      
      if (payload.type !== 'refresh') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Invalid token type',
        });
      }

      // Find user
      const user = Array.from(users.values()).find(u => u.id === payload.sub);
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'User associated with token not found',
        });
      }

      // Generate new access token
      const newAccessToken = generateToken(user);

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
      });
    } catch (verifyError) {
      // Remove invalid refresh token
      refreshTokens.delete(token);
      
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid or expired refresh token',
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error during token refresh',
    });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      refreshTokens.delete(token);
    }

    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error during logout',
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
    }

    // Find full user data
    const user = Array.from(users.values()).find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Profile retrieved successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'Internal server error during profile retrieval',
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required',
      });
    }

    // Find user
    const user = Array.from(users.values()).find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (newPassword.length < authConfig.password.minLength) {
      return res.status(400).json({
        error: 'Weak password',
        message: `New password must be at least ${authConfig.password.minLength} characters long`,
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, authConfig.password.saltRounds);

    // Update user
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    users.set(user.email, user);

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'Internal server error during password change',
    });
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};
