const { User } = require("../models");
const { signToken } = require("../config/jwt");
const { createError } = require("../middlewares/errorHandler");
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return next(createError(400, "Name, email, and password are required."));
    }
    if (password.length < 8) {
      return next(createError(400, "Password must be at least 8 characters."));
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return next(createError(409, "An account with that email already exists."));
    }
    const user = await User.create({ name, email, password });
    const token = signToken({ id: user.id, email: user.email });

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError(400, "Email and password are required."));
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(createError(401, "Invalid email or password."));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(createError(401, "Invalid email or password."));
    }
    if (!user.is_active) {
      return next(createError(403, "Your account has been deactivated."));
    }
    const token = signToken({ id: user.id, email: user.email });
    return res.status(200).json({
      message: "Logged in successfully.",
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;
    const user = req.user;
    if (name) user.name = name;
    if (avatar_url) user.avatar_url = avatar_url;
    await user.save();
    return res.status(200).json({ message: "Profile updated.", user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateMe };
