const ApiError = require('../utils/ApiError');

/**
 * Validates request property against a given Joi schema.
 * @param {Object} schema - Joi Schema to validate against.
 * @param {string} property - The property on request object to validate: 'body', 'query', or 'params'.
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const errorMessage = errorDetails.map((d) => d.message).join(', ');
      return next(new ApiError(400, `Validation failed: ${errorMessage}`, errorDetails));
    }

    // Replace the request data with the sanitized and validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;
