import { validationErrorResponse } from '../utils/response.js';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const dataToValidate = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const errors = result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        return validationErrorResponse(res, errors);
      }

      // Replace request data with validated data
      req.body = result.data.body || req.body;
      req.query = result.data.query || req.query;
      req.params = result.data.params || req.params;

      next();
    } catch (error) {
      return validationErrorResponse(res, [{ field: 'validation', message: 'Validation failed' }]);
    }
  };
};

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        return validationErrorResponse(res, errors);
      }

      req.body = result.data;
      next();
    } catch (error) {
      return validationErrorResponse(res, [{ field: 'validation', message: 'Validation failed' }]);
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const errors = result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        return validationErrorResponse(res, errors);
      }

      req.query = result.data;
      next();
    } catch (error) {
      return validationErrorResponse(res, [{ field: 'validation', message: 'Validation failed' }]);
    }
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const errors = result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code,
        }));

        return validationErrorResponse(res, errors);
      }

      req.params = result.data;
      next();
    } catch (error) {
      return validationErrorResponse(res, [{ field: 'validation', message: 'Validation failed' }]);
    }
  };
};
