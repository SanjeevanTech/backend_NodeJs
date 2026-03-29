const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
    bus_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    // Face recognition data
    face_embedding: {
        type: [Number],
        required: true
    },
    // Multi-lighting embeddings (up to 5 captures under different lighting)
    // Server compares ALL stored embeddings and accepts if ANY one matches.
    // Backward compatible: old single face_embedding still works.
    face_embeddings: {
        type: [[Number]],
        default: []
    },
    embedding_size: {
        type: Number,
        required: true
    },
    face_photo_url: String, // Optional: store photo reference

    // Metadata
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, { collection: 'contractors' });

// Index for fast bus lookup
contractorSchema.index({ bus_id: 1 });

module.exports = mongoose.model('Contractor', contractorSchema);
