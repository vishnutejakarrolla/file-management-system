const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: String, required: true },
    parentFolder: { type: String, default: '' }, // '', '_Shared', '_Trash', or folder path
    isDir: { type: Boolean, default: false },
    size: { type: Number, default: 0 },
    isStarred: { type: Boolean, default: false },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' },
    date: { type: Date, default: Date.now },
    ms: { type: Number, default: () => Date.now() }
});

module.exports = mongoose.model('File', fileSchema);
