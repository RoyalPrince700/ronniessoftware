// Simple validation utilities to replace express-validator
const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

const validateMinLength = (value, minLength, fieldName) => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

const validateNumeric = (value, fieldName) => {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
};

const validateBoolean = (value, fieldName) => {
  if (value !== true && value !== false && value !== 'true' && value !== 'false') {
    return `${fieldName} must be a boolean`;
  }
  return null;
};

const validateObject = (obj, validations) => {
  const errors = {};

  for (const [field, rules] of Object.entries(validations)) {
    const value = obj[field];

    for (const rule of rules) {
      const error = rule(value, field);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Middleware for validation
const validateRequest = (validations) => {
  return (req, res, next) => {
    const { isValid, errors } = validateObject(req.body, validations);

    if (!isValid) {
      return res.status(400).json({ errors });
    }

    next();
  };
};

module.exports = {
  validateRequired,
  validateEmail,
  validateMinLength,
  validateNumeric,
  validateBoolean,
  validateObject,
  validateRequest
};