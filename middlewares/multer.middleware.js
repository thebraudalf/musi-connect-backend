import multer from "multer";

/**
 * @constant storage
 * Configures the Multer Disk Storage engine.[cite: 10]
 * - 'destination': Defines the local folder path ('./public/temp') where files are temporarily held.[cite: 10]
 * - 'filename': Retains the original name of the uploaded file for easier identification.[cite: 10]
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
 * Initialized Multer instance using the disk storage configuration.[cite: 10]
 * This instance is used as middleware in routes to handle multipart/form-data (file uploads).[cite: 10]
 */ 
 export const upload = multer({
    storage: storage
 })
