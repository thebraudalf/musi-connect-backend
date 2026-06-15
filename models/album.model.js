import mongoose, { Schema } from "mongoose";

const albumSchema = new Schema({
    albumId: {
        type: String,
    },
    name: {
        type: String,
    },
    description: {
        type: String,
    },
    year: {
        type: String,
    },
    language: {
        type: String,
    },
    artists: {
        type: [Object],
    },
    image: {
        type: [Object],
    }
}, { timestamps: true });

export const Album = mongoose.model('Album', albumSchema);
