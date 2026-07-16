const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileData: {
      type: Buffer, // Storing file directly in DB
      required: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    studentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    }],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
