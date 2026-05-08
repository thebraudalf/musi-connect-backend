import multer from "multer";

/**
 * @constant storage
 * Configures the Multer Disk Storage engine.
 * - 'destination': Defines the local folder path ('./public/temp') where files are temporarily held.
 * - 'filename': Retains the original name of the uploaded file for easier identification.
 */
 const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }

 })

/**
 * @constant upload
 * Initialized Multer instance using the disk storage configuration.
 * This instance is used as middleware in routes to handle multipart/form-data (file uploads).
 */ 
 export const upload = multer({
    storage: storage
 })
