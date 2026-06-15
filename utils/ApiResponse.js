/**
 * @class ApiResponse
 * A uniform structure for all successful API responses.
 * - 'data': The primary payload (user info, song lists, etc.) being sent to the client.
 * - 'success': A boolean flag automatically set to 'true' for status codes below 400.
 * - Ensures the frontend consistently receives the same JSON structure for every successful request.
 */
class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }
