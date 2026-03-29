const Contractor = require('../models/Contractor');

// @desc    Get all contractors
// @route   GET /api/contractors
// @access  Private
const getContractors = async (req, res) => {
    try {
        const contractors = await Contractor.find().sort({ created_at: -1 });
        res.json({
            success: true,
            count: contractors.length,
            contractors
        });
    } catch (error) {
        console.error('Error fetching contractors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contractors',
            error: error.message
        });
    }
};

// @desc    Get contractor by bus_id
// @route   GET /api/contractors/:bus_id
// @access  Private
const getContractorByBusId = async (req, res) => {
    try {
        const contractor = await Contractor.findOne({ bus_id: req.params.bus_id });
        if (!contractor) {
            return res.status(404).json({
                success: false,
                message: 'Contractor not found for this bus'
            });
        }
        res.json({
            success: true,
            contractor
        });
    } catch (error) {
        console.error('Error fetching contractor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contractor',
            error: error.message
        });
    }
};

// @desc    Create or Update contractor
// @route   POST /api/contractors
// @access  Private
const upsertContractor = async (req, res) => {
    try {
        const { bus_id, name, face_embedding, face_embeddings, embedding_size, face_photo_url } = req.body;

        if (!bus_id || !name || (!face_embedding && !face_embeddings)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide bus_id, name and face_embedding (or face_embeddings array)'
            });
        }

        // Resolve the primary embedding
        // face_embeddings is an array of arrays (multi-lighting captures).
        // face_embedding is a single flat array (legacy / single capture).
        const primaryEmbedding = face_embedding || (face_embeddings && face_embeddings[0]) || [];

        // Build the list of embeddings to push (new captures only, avoid duplicates)
        const newEmbeddings = face_embeddings && Array.isArray(face_embeddings)
            ? face_embeddings
            : [primaryEmbedding];

        // Find existing contractor to merge embeddings
        const existing = await Contractor.findOne({ bus_id, name });
        let mergedEmbeddings = (existing && existing.face_embeddings) ? [...existing.face_embeddings] : [];

        // Push new captures (keep max 5 most recent)
        for (const emb of newEmbeddings) {
            if (emb && emb.length > 0) {
                mergedEmbeddings.push(emb);
            }
        }
        if (mergedEmbeddings.length > 5) {
            mergedEmbeddings = mergedEmbeddings.slice(-5); // keep latest 5
        }

        const contractorData = {
            bus_id,
            name,
            face_embedding: primaryEmbedding,          // backward compat
            face_embeddings: mergedEmbeddings,          // multi-lighting set
            embedding_size: embedding_size || primaryEmbedding.length,
            face_photo_url,
            needs_hardware_sync: true,
            updated_at: Date.now()
        };

        const contractor = await Contractor.findOneAndUpdate(
            { bus_id, name },
            { $set: contractorData },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            message: `Contractor saved. Total embeddings stored: ${mergedEmbeddings.length}/5`,
            embeddings_count: mergedEmbeddings.length,
            contractor
        });
    } catch (error) {
        console.error('Error saving contractor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save contractor',
            error: error.message
        });
    }
};

// @desc    Delete contractor
// @route   DELETE /api/contractors/:bus_id
// @access  Private
const deleteContractor = async (req, res) => {
    try {
        const contractor = await Contractor.findOneAndDelete({ bus_id: req.params.bus_id });
        if (!contractor) {
            return res.status(404).json({
                success: false,
                message: 'Contractor not found'
            });
        }
        res.json({
            success: true,
            message: 'Contractor deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting contractor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contractor',
            error: error.message
        });
    }
};

module.exports = {
    getContractors,
    getContractorByBusId,
    upsertContractor,
    deleteContractor
};
