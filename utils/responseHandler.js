// api success response handle
const sendSuccessResponse = (res, statusCode, message, data = null) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

// api error response handle
const sendErrorResponse = (res, statusCode, message, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors !== null) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    sendSuccessResponse,
    sendErrorResponse
}