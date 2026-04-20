const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');
const { encryptStream, decryptStream } = require('../utils/encryption');
const File = require('../models/File');
const User = require('../models/User');

// Upload File (encrypt -> GridFS)
exports.uploadFile = async (req, res) => {
    const username = req.user.username;
    if (!req.file) return res.status(400).json({ success: false, msg: 'No file uploaded' });

    const folder = req.body.folder || '';
    const filename = req.file.originalname;

    try {
        const existing = await File.findOne({ owner: username, parentFolder: folder, name: filename });
        if (existing) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, msg: 'File already exists' });
        }

        const gfs = req.app.get('gfs');
        const uploadStream = gfs.openUploadStream(filename);
        const readStream = fs.createReadStream(req.file.path);

        await encryptStream(readStream, uploadStream);

        const newFile = new File({
            name: filename,
            owner: username,
            parentFolder: folder,
            isDir: false,
            size: req.file.size,
            gridFsId: uploadStream.id
        });
        await newFile.save();

        fs.unlinkSync(req.file.path);

        if (req.app.get('io')) {
            req.app.get('io').to(username).emit('file_updated', { msg: 'File uploaded' });
        }
        res.status(200).json({ success: true, msg: 'Uploaded successfully' });
    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, msg: 'Upload failed' });
    }
};

// Get files metadata
exports.getFiles = async (req, res) => {
    const username = req.user.username;
    const folder = req.query.folder || '';
    
    try {
        const files = await File.find({ owner: username, parentFolder: folder });
        
        const response = files.map(f => ({
            name: f.name,
            isDir: f.isDir,
            size: f.size,
            date: f.date,
            ms: f.ms
        }));
        
        res.json(response);
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// Download file (GridFS -> decrypt -> res)
exports.downloadFile = async (req, res) => {
    const username = req.user.username;
    let filename = req.query.file;
    // Extract base filename if it has path
    const parts = filename.split('/');
    const baseName = parts.pop();
    const folder = parts.join('/');
    
    try {
        const fileDoc = await File.findOne({ owner: username, parentFolder: folder, name: baseName });
        if (!fileDoc || fileDoc.isDir) {
             return res.status(404).json({ success: false, msg: 'File not found' });
        }
        
        const gfs = req.app.get('gfs');
        const readStream = gfs.openDownloadStream(fileDoc.gridFsId);
        
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        await decryptStream(readStream, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
             res.status(500).json({ success: false, msg: 'Decryption failed' });
        }
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    const username = req.user.username;
    let filename = req.body.filename;
    
    const parts = filename.split('/');
    const baseName = parts.pop();
    const folder = parts.join('/');
    
    try {
        const fileDoc = await File.findOne({ owner: username, parentFolder: folder, name: baseName });
        
        if (!fileDoc) {
            return res.status(404).json({ success: false, msg: 'File not found' });
        }
        
        if (folder === '_Trash') {
            // Permanent delete
            if (!fileDoc.isDir && fileDoc.gridFsId) {
                const gfs = req.app.get('gfs');
                await gfs.delete(fileDoc.gridFsId);
            } else if (fileDoc.isDir) {
                // Delete all children permanently
                const children = await File.find({ owner: username, parentFolder: new RegExp('^_Trash/' + baseName) });
                for(let child of children) {
                    if (!child.isDir && child.gridFsId) {
                        try { await req.app.get('gfs').delete(child.gridFsId); } catch(e){}
                    }
                    await child.deleteOne();
                }
            }
            await fileDoc.deleteOne();
        } else {
            // Move to trash
            let newName = baseName;
            const existingInTrash = await File.findOne({ owner: username, parentFolder: '_Trash', name: newName });
            if (existingInTrash) {
                newName = `${Date.now()}_${newName}`;
            }
            fileDoc.parentFolder = '_Trash';
            fileDoc.name = newName;
            await fileDoc.save();
            
            // Move children to trash
            if (fileDoc.isDir) {
                const oldPrefix = folder ? `${folder}/${baseName}` : baseName;
                const newPrefix = `_Trash/${newName}`;
                const children = await File.find({ owner: username, parentFolder: new RegExp('^' + oldPrefix) });
                for(let child of children) {
                    child.parentFolder = child.parentFolder.replace(oldPrefix, newPrefix);
                    await child.save();
                }
            }
        }
        
        if (req.app.get('io')) {
             req.app.get('io').to(username).emit('file_updated', { msg: 'Deleted successfully' });
        }
        
        res.json({ success: true, msg: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Delete failed' });
    }
};

// Create Folder
exports.createFolder = async (req, res) => {
    const username = req.user.username;
    const folderName = req.body.folderName;
    const parentFolder = req.body.parentFolder || '';
    
    try {
        const existing = await File.findOne({ owner: username, parentFolder, name: folderName });
        if (existing) {
            return res.status(400).json({ success: false, msg: 'Folder already exists' });
        }
        
        const newFolder = new File({
            name: folderName,
            owner: username,
            parentFolder,
            isDir: true
        });
        await newFolder.save();
        
        if (req.app.get('io')) {
             req.app.get('io').to(username).emit('file_updated', { msg: 'Folder created' });
        }
        
        res.json({ success: true, msg: 'Folder created' });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'Folder creation failed' });
    }
};

// Save Text File
exports.saveText = async (req, res) => {
    const username = req.user.username;
    const { filename, content, folder } = req.body;
    
    if (!filename) return res.status(400).json({ success: false, msg: 'Filename required' });
    
    try {
        let fileDoc = await File.findOne({ owner: username, parentFolder: folder || '', name: filename });
        const gfs = req.app.get('gfs');
        
        if (fileDoc && fileDoc.gridFsId) {
            // Delete old content
            await gfs.delete(fileDoc.gridFsId);
        }
        
        const uploadStream = gfs.openUploadStream(filename);
        const readStream = Readable.from([content]);
        
        await encryptStream(readStream, uploadStream);
        
        if (!fileDoc) {
            fileDoc = new File({
                name: filename,
                owner: username,
                parentFolder: folder || '',
                isDir: false
            });
        }
        fileDoc.size = Buffer.byteLength(content, 'utf8');
        fileDoc.gridFsId = uploadStream.id;
        fileDoc.ms = Date.now();
        await fileDoc.save();
        
        if (req.app.get('io')) {
             req.app.get('io').to(username).emit('file_updated', { msg: 'Text file saved' });
        }
        
        res.status(200).json({ success: true, msg: 'Saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Failed to save text' });
    }
};

// Read Text File
exports.readText = async (req, res) => {
    const username = req.user.username;
    let filename = req.query.filename;
    
    const parts = filename.split('/');
    const baseName = parts.pop();
    const folder = parts.join('/');
    
    try {
        const fileDoc = await File.findOne({ owner: username, parentFolder: folder, name: baseName });
        if (!fileDoc || fileDoc.isDir) {
            return res.status(404).json({ success: false, msg: 'File not found' });
        }
        
        const gfs = req.app.get('gfs');
        const readStream = gfs.openDownloadStream(fileDoc.gridFsId);
        let decrypted = '';
        
        const writeStream = new Writable({
            write(chunk, encoding, callback) {
                decrypted += chunk.toString();
                callback();
            }
        });
        
        await decryptStream(readStream, writeStream);
        res.status(200).json({ success: true, content: decrypted });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Failed to read text' });
    }
};

// Share File/Folder
exports.share = async (req, res) => {
    const username = req.user.username;
    const { itemPath, targetUser } = req.body;
    
    const parts = itemPath.split('/');
    const baseName = parts.pop();
    const folder = parts.join('/');
    
    try {
        const fileDoc = await File.findOne({ owner: username, parentFolder: folder, name: baseName });
        if (!fileDoc) return res.status(404).json({ success: false, msg: 'Item not found' });
        
        const tUser = await User.findOne({ username: targetUser });
        if (!tUser) return res.status(404).json({ success: false, msg: 'Target user not found' });
        
        // In MongoDB, we can just duplicate the metadata and point to the same gridFsId
        // This is safe because gridFs items are immutable here
        const newShare = new File({
            name: baseName,
            owner: targetUser,
            parentFolder: '_Shared',
            isDir: fileDoc.isDir,
            size: fileDoc.size,
            gridFsId: fileDoc.gridFsId
        });
        await newShare.save();
        
        if (req.app.get('io')) {
             req.app.get('io').to(targetUser).emit('file_updated', { msg: `${username} shared ${baseName} with you` });
        }
        
        res.status(200).json({ success: true, msg: 'Shared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Share failed' });
    }
};

// Copy File
exports.copyFile = async (req, res) => {
    const username = req.user.username;
    const { sourcePath, targetPath } = req.body;
    
    const srcParts = sourcePath.split('/');
    const srcBase = srcParts.pop();
    const srcFolder = srcParts.join('/');
    
    const destParts = targetPath.split('/');
    const destBase = destParts.pop();
    const destFolder = destParts.join('/');
    
    try {
        const srcDoc = await File.findOne({ owner: username, parentFolder: srcFolder, name: srcBase });
        if (!srcDoc) return res.status(404).json({ success: false, msg: 'Source item not found' });
        
        if (srcDoc.isDir) {
             return res.status(400).json({ success: false, msg: 'Cannot copy folder currently' });
        }
        
        let destDoc = await File.findOne({ owner: username, parentFolder: destFolder, name: destBase });
        
        // We actually need to duplicate the gridFS stream to ensure isolated editing,
        // but for read-only we could point to same ID. Wait, if it's a text file and user edits it,
        // it deletes the old gridFsId. If they share the ID, editing one deletes it for both!
        // We MUST duplicate the gridFS file.
        
        const gfs = req.app.get('gfs');
        const readStream = gfs.openDownloadStream(srcDoc.gridFsId);
        
        if (destDoc && destDoc.gridFsId) {
             await gfs.delete(destDoc.gridFsId); // Delete old target
        }
        
        const uploadStream = gfs.openUploadStream(destBase);
        
        // It's already encrypted, just pipe it raw to the new file! No need to decrypt/encrypt.
        await new Promise((resolve, reject) => {
             readStream.pipe(uploadStream)
                 .on('finish', resolve)
                 .on('error', reject);
        });
        
        if (!destDoc) {
             destDoc = new File({
                 name: destBase,
                 owner: username,
                 parentFolder: destFolder,
                 isDir: false
             });
        }
        
        destDoc.gridFsId = uploadStream.id;
        destDoc.size = srcDoc.size;
        destDoc.ms = Date.now();
        await destDoc.save();
        
        if (req.app.get('io')) {
             req.app.get('io').to(username).emit('file_updated', { msg: 'Copied successfully' });
        }
        
        res.status(200).json({ success: true, msg: 'Copied successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Copy failed' });
    }
};

exports.getRecent = async (req, res) => {
    const username = req.user.username;
    
    try {
        const files = await File.find({ owner: username, parentFolder: { $ne: '_Trash' }, isDir: false })
            .sort({ ms: -1 })
            .limit(20);
            
        const response = files.map(f => ({
            name: f.parentFolder ? `${f.parentFolder}/${f.name}` : f.name,
            isDir: f.isDir,
            size: f.size,
            date: f.date,
            ms: f.ms
        }));
        
        res.json(response);
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.toggleStar = async (req, res) => {
    const username = req.user.username;
    const { filepath } = req.body;
    
    const parts = filepath.split('/');
    const baseName = parts.pop();
    const folder = parts.join('/');
    
    try {
        const fileDoc = await File.findOne({ owner: username, parentFolder: folder, name: baseName });
        if (!fileDoc) return res.status(404).json({ success: false, msg: 'File not found' });
        
        fileDoc.isStarred = !fileDoc.isStarred;
        await fileDoc.save();
        
        if (req.app.get('io')) {
             req.app.get('io').to(username).emit('file_updated', { msg: 'Star updated' });
        }
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ success: false });
    }
};

exports.getStarred = async (req, res) => {
    const username = req.user.username;
    
    try {
        const files = await File.find({ owner: username, parentFolder: { $ne: '_Trash' }, isStarred: true });
        
        const response = files.map(f => ({
            name: f.parentFolder ? `${f.parentFolder}/${f.name}` : f.name,
            isDir: f.isDir,
            size: f.size,
            date: f.date,
            ms: f.ms
        }));
        res.json(response);
    } catch (err) {
        res.status(500).json({ success: false });
    }
};
