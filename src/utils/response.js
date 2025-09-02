export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    ok: true,
    data,
    message,
  });
};

export const errorResponse = (res, error, statusCode = 500) => {
  const errorMessage = error.message || 'Internal server error';
  const errorCode = error.code || 'INTERNAL_ERROR';
  
  return res.status(statusCode).json({
    ok: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: error.details || null,
    },
  });
};

export const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
    },
  });
};

export const notFoundResponse = (res, resource = 'Resource') => {
  return res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
  });
};

export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  });
};

export const forbiddenResponse = (res, message = 'Forbidden') => {
  return res.status(403).json({
    ok: false,
    error: {
      code: 'FORBIDDEN',
      message,
    },
  });
};

export const paginatedResponse = (res, data, pagination) => {
  return res.status(200).json({
    ok: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  });
};
