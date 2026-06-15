/**
 * @class ApiError
 * A standardized class for handling API-specific errors throughout the application.
 * - Extends the built-in 'Error' class to maintain compatibility with Node.js error tracking.
 * - 'statusCode': Stores the HTTP status code (e.g., 400, 404, 500) to be sent to the client.
 * - 'errors': An array used to store multiple validation errors (common with Joi/form validation).
 * - 'Error.captureStackTrace': Ensures the error stack trace points to where the error was actually instantiated.
 */
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.messsage = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError }
