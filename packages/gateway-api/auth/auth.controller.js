import { generateToken, generateRefreshToken, verifyToken } from '../middleware/auth.middleware.js';
import { authConfig } from '../config/auth.config.js';
import { UserService } from '../database/userService.js';

// Initialize database user service
const userService = new UserService();

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

    // Validate password strength
    if (password.length < authConfig.password.minLength) {
      return res.status(400).json({
        error: 'Weak password',
        message: `Password must be at least ${authConfig.password.minLength} characters long`,
      });
    }

    // Create user using database service
    const newUser = await userService.createUser({
      email,
      password,
      firstName,
      lastName,
      roles: [role]
    });

    // Generate tokens
    const accessToken = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    
    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await userService.storeRefreshToken(newUser.id, refreshToken, expiresAt);

    // Log user action
    await userService.logUserAction(
      newUser.id, 
      'register', 
      'auth', 
      { role }, 
      req.ip, 
      req.headers['user-agent']
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'User exists',
        message: error.message,
      });
    }

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

    // Verify user credentials using database service
    const user = await userService.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await userService.storeRefreshToken(user.id, refreshToken, expiresAt);

    // Log user action
    await userService.logUserAction(
      user.id, 
      'login', 
      'auth', 
      null, 
      req.ip, 
      req.headers['user-agent']
    );

    res.json({
      message: 'Login successful',
      user,
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

    // Verify refresh token using database service
    const user = await userService.verifyRefreshToken(token);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid or expired refresh token',
      });
    }

    try {
      // Verify token structure
      const payload = verifyToken(token);
      
      if (payload.type !== 'refresh') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Invalid token type',
        });
      }

      // Generate new access token
      const newAccessToken = generateToken(user);

      // Log user action
      await userService.logUserAction(
        user.id, 
        'token_refresh', 
        'auth', 
        null, 
        req.ip, 
        req.headers['user-agent']
      );

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
      });
    } catch (verifyError) {
      // Revoke invalid refresh token
      await userService.revokeRefreshToken(token);
      
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
      await userService.revokeRefreshToken(token);
    }

    // Log user action if user is authenticated
    if (req.user?.id) {
      await userService.logUserAction(
        req.user.id, 
        'logout', 
        'auth', 
        null, 
        req.ip, 
        req.headers['user-agent']
      );
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

    // Get user data from database
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Log user action
    await userService.logUserAction(
      user.id, 
      'profile_view', 
      'profile', 
      null, 
      req.ip, 
      req.headers['user-agent']
    );

    res.json({
      message: 'Profile retrieved successfully',
      user,
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

    // Validate new password
    if (newPassword.length < authConfig.password.minLength) {
      return res.status(400).json({
        error: 'Weak password',
        message: `New password must be at least ${authConfig.password.minLength} characters long`,
      });
    }

    // Update password using database service
    await userService.updatePassword(req.user.id, currentPassword, newPassword);

    // Log user action
    await userService.logUserAction(
      req.user.id, 
      'password_change', 
      'auth', 
      null, 
      req.ip, 
      req.headers['user-agent']
    );

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);

    if (error.message.includes('Current password is incorrect')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
      });
    }

    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: 'User not found',
        message: error.message,
      });
    }

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
