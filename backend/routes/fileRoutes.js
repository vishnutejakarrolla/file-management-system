const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware');
const fileController = require('../controllers/fileController');

const upload = multer({ dest: 'backend/storage/temp/' });

router.use(verifyToken); // Protect all file routes

router.post('/upload', upload.array('file'), fileController.uploadFile);
router.get('/list', fileController.getFiles);
router.get('/download', fileController.downloadFile);
router.get('/view', fileController.viewFile);
router.delete('/file', fileController.deleteFile);
router.post('/create-folder', fileController.createFolder);
router.post('/save-text', fileController.saveText);
router.get('/read-text', fileController.readText);
router.post('/share', fileController.share);
router.post('/copy', fileController.copyFile);
router.get('/recent', fileController.getRecent);
router.get('/starred', fileController.getStarred);
router.post('/toggle-star', fileController.toggleStar);
router.post('/move', fileController.moveItem);

module.exports = router;
