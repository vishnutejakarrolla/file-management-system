const BACKEND_URL = '__BACKEND_URL__';
const API_URL = `${BACKEND_URL}/api`;
let currentFolder = '';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('welcomeUser').innerText = username;
    document.getElementById('userAvatar').innerText = username.charAt(0).toUpperCase();

    // Socket.io setup
    const socket = io(BACKEND_URL);
    socket.emit('join_room', username);
    
    socket.on('file_updated', (data) => {
        // Automatically refresh files on event
        loadFiles();
        showNotification(data.msg || 'Files updated', 'success');
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.innerHTML = currentTheme === 'light' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        themeToggle.addEventListener('click', () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const newTheme = isLight ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.innerHTML = newTheme === 'light' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    });

    // Initial Load
    loadFiles();

    // Drag & Drop
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            uploadFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            uploadFiles(e.target.files);
        }
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.file-card');
        cards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            if (name.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // New Folder Modal
    const folderModal = document.getElementById('folderModal');
    document.getElementById('newFolderBtn').addEventListener('click', () => {
        folderModal.classList.add('active');
        document.getElementById('folderNameInput').focus();
    });

    document.getElementById('cancelFolderBtn').addEventListener('click', () => {
        folderModal.classList.remove('active');
        document.getElementById('folderNameInput').value = '';
    });

    document.getElementById('confirmFolderBtn').addEventListener('click', async () => {
        const folderName = document.getElementById('folderNameInput').value;
        if (folderName) {
            await createFolder(folderName);
            folderModal.classList.remove('active');
            document.getElementById('folderNameInput').value = '';
        }
    });

    // Editor Modal
    const editorModal = document.getElementById('editorModal');
    document.getElementById('newTextBtn').addEventListener('click', () => {
        document.getElementById('editorTitle').innerText = 'New Text File';
        document.getElementById('editorFilename').value = '';
        document.getElementById('editorFilename').disabled = false;
        document.getElementById('editorContent').value = '';
        editorModal.classList.add('active');
        document.getElementById('editorFilename').focus();
    });

    document.getElementById('cancelEditorBtn').addEventListener('click', () => {
        editorModal.classList.remove('active');
    });

    document.getElementById('saveEditorBtn').addEventListener('click', async () => {
        const filename = document.getElementById('editorFilename').value;
        const content = document.getElementById('editorContent').value;
        if (!filename) return showNotification('Filename is required', 'error');
        if (!filename.endsWith('.txt')) return showNotification('Only .txt files are supported', 'error');
        
        await saveTextFile(filename, content);
        editorModal.classList.remove('active');
    });

    // Share Modal
    const shareModal = document.getElementById('shareModal');
    document.getElementById('cancelShareBtn').addEventListener('click', () => {
        shareModal.classList.remove('active');
    });
    
    document.getElementById('confirmShareBtn').addEventListener('click', async () => {
        const targetUser = document.getElementById('shareTargetUser').value;
        const itemPath = document.getElementById('confirmShareBtn').dataset.itemPath;
        if (!targetUser) return showNotification('Target user required', 'error');
        
        await shareItem(itemPath, targetUser);
        shareModal.classList.remove('active');
        document.getElementById('shareTargetUser').value = '';
    });

    // Copy Modal
    const copyModal = document.getElementById('copyModal');
    document.getElementById('cancelCopyBtn').addEventListener('click', () => {
        copyModal.classList.remove('active');
    });

    document.getElementById('confirmCopyBtn').addEventListener('click', async () => {
        const targetPath = document.getElementById('copyTargetName').value;
        const sourcePath = document.getElementById('confirmCopyBtn').dataset.sourcePath;
        if (!targetPath) return showNotification('Target path required', 'error');
        
        await copyItem(sourcePath, targetPath);
        copyModal.classList.remove('active');
        document.getElementById('copyTargetName').value = '';
    });

    // Inline Copy Bar
    document.getElementById('inlineCopyBtn').addEventListener('click', async () => {
        const sourcePath = document.getElementById('inlineCopySource').value;
        const targetPath = document.getElementById('inlineCopyTarget').value;
        if (!sourcePath || !targetPath) return showNotification('Both source and target required', 'error');
        
        const src = currentFolder ? `${currentFolder}/${sourcePath}` : sourcePath;
        const dest = currentFolder ? `${currentFolder}/${targetPath}` : targetPath;
        
        await copyItem(src, dest);
        document.getElementById('inlineCopySource').value = '';
        document.getElementById('inlineCopyTarget').value = '';
    });
    
    // Setup Tabs
    let currentTab = 'drive';

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('nav .nav-item').forEach(el => el.classList.remove('active'));
        
        // Find tab element based on its icon/text since they don't have ids
        const items = document.querySelectorAll('nav .nav-item');
        if (tab === 'drive') items[0].classList.add('active');
        if (tab === 'shared') items[1].classList.add('active');
        if (tab === 'recent') items[2].classList.add('active');
        if (tab === 'starred') items[3].classList.add('active');
        if (tab === 'trash') items[4].classList.add('active');
        
        currentFolder = '';
        
        if (tab === 'drive') {
            document.getElementById('currentPath').innerText = 'My Drive';
        } else if (tab === 'shared') {
            currentFolder = '_Shared';
            document.getElementById('currentPath').innerText = 'Shared with me';
        } else if (tab === 'trash') {
            currentFolder = '_Trash';
            document.getElementById('currentPath').innerText = 'Trash';
        } else if (tab === 'recent') {
            document.getElementById('currentPath').innerText = 'Recent';
        } else if (tab === 'starred') {
            document.getElementById('currentPath').innerText = 'Starred';
        }
        
        loadFiles();
    }

    const navItems = document.querySelectorAll('nav .nav-item');
    navItems[0].addEventListener('click', () => switchTab('drive'));
    navItems[1].addEventListener('click', () => switchTab('shared'));
    navItems[2].addEventListener('click', () => switchTab('recent'));
    navItems[3].addEventListener('click', () => switchTab('starred'));
    navItems[4].addEventListener('click', () => switchTab('trash'));
});

// Notifications
function showNotification(msg, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerText = msg;
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Load Files
async function loadFiles() {
    const token = localStorage.getItem('token');
    try {
        let endpoint = `${API_URL}/files/list?folder=${encodeURIComponent(currentFolder)}`;
        const currentTab = document.querySelector('nav .nav-item.active').innerText.trim().toLowerCase();
        
        if (currentTab === 'recent') endpoint = `${API_URL}/files/recent`;
        if (currentTab === 'starred') endpoint = `${API_URL}/files/starred`;

        const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            if(res.status === 401 || res.status === 403) {
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Failed to load files');
        }

        const files = await res.json();
        renderFiles(files);
        updateDashboardStats(files);
        
    } catch (err) {
        console.error(err);
        showNotification('Error loading files', 'error');
    }
}

// Render Files to Grid
function renderFiles(files) {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '';

    if (currentFolder) {
        // Add "Go Back" item
        const backCard = document.createElement('div');
        backCard.className = 'file-card';
        backCard.innerHTML = `
            <div class="file-icon folder"><i class="fas fa-level-up-alt"></i></div>
            <div class="file-name">..</div>
        `;
        backCard.onclick = () => {
            currentFolder = currentFolder.split('/').slice(0, -1).join('/');
            document.getElementById('currentPath').innerText = currentFolder || 'My Drive';
            loadFiles();
        };
        grid.appendChild(backCard);
    }

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.name = file.name;
        
        let iconHtml = '';
        if (file.isDir) {
            iconHtml = '<i class="fas fa-folder"></i>';
        } else {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) iconHtml = '<i class="fas fa-image"></i>';
            else if (['mp4', 'avi', 'mkv'].includes(ext)) iconHtml = '<i class="fas fa-video"></i>';
            else if (['mp3', 'wav'].includes(ext)) iconHtml = '<i class="fas fa-music"></i>';
            else if (['pdf'].includes(ext)) iconHtml = '<i class="fas fa-file-pdf"></i>';
            else if (['doc', 'docx'].includes(ext)) iconHtml = '<i class="fas fa-file-word"></i>';
            else if (['txt'].includes(ext)) iconHtml = '<i class="fas fa-file-alt"></i>';
            else iconHtml = '<i class="fas fa-file"></i>';
        }

        const date = new Date(file.date).toLocaleDateString();

        card.innerHTML = `
            <div class="file-icon ${file.isDir ? 'folder' : ''}">${iconHtml}</div>
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-meta">
                <span>${file.isDir ? 'Folder' : formatBytes(file.size)}</span>
                <span>${date}</span>
            </div>
            <div class="file-actions">
                <button class="btn-icon" onclick="toggleStar('${file.name}', event)" title="Star"><i class="fas fa-star" style="color: gold;"></i></button>
                ${!file.isDir && file.name.endsWith('.txt') ? `<button class="btn-icon" onclick="openEditor('${file.name}', event)" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                <button class="btn-icon" onclick="openCopy('${file.name}', event)" title="Copy"><i class="fas fa-copy"></i></button>
                <button class="btn-icon" onclick="openShare('${file.name}', event)" title="Share"><i class="fas fa-share-alt"></i></button>
                ${!file.isDir ? `<button class="btn-icon" onclick="downloadFile('${file.name}', event)" title="Download"><i class="fas fa-download"></i></button>` : ''}
                <button class="btn-icon" style="color:var(--danger-color)" onclick="deleteFile('${file.name}', event)" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        if (file.isDir) {
            card.onclick = () => {
                currentFolder = currentFolder ? `${currentFolder}/${file.name}` : file.name;
                document.getElementById('currentPath').innerText = currentFolder;
                loadFiles();
            };
        }

        grid.appendChild(card);
    });
}

function updateDashboardStats(files) {
    const totalFiles = files.filter(f => !f.isDir).length;
    const totalSize = files.reduce((acc, f) => acc + (f.isDir ? 0 : f.size), 0);
    
    document.getElementById('totalFiles').innerText = totalFiles;
    document.getElementById('storageUsed').innerText = formatBytes(totalSize);
}

// Upload Files
async function uploadFiles(files) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }
    formData.append('folder', currentFolder);

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/files/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
            }
        };

        xhr.onload = function() {
            progressContainer.style.display = 'none';
            if (xhr.status === 200) {
                showNotification('Upload complete');
                // loadFiles() will be called automatically by socket event
            } else {
                showNotification('Upload failed', 'error');
            }
        };

        xhr.send(formData);
    } catch (err) {
        console.error(err);
        progressContainer.style.display = 'none';
        showNotification('Upload error', 'error');
    }
}

// Download File
function downloadFile(filename, event) {
    event.stopPropagation();
    const token = localStorage.getItem('token');
    
    const filePath = currentFolder ? `${currentFolder}/${filename}` : filename;
    const url = `${API_URL}/files/download?file=${encodeURIComponent(filePath)}`;
    
    // Create an invisible link to trigger download with auth header not supported by <a> tags directly
    // Instead we fetch the blob
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(err => {
        console.error(err);
        showNotification('Error downloading file', 'error');
    });
}

// Delete File
async function deleteFile(filename, event) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    const token = localStorage.getItem('token');
    const filePath = currentFolder ? `${currentFolder}/${filename}` : filename;

    try {
        const res = await fetch(`${API_URL}/files/file`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: filePath })
        });
        
        const data = await res.json();
        if (data.success) {
            // loadFiles() handles by socket event
            showNotification('Deleted successfully');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error deleting file', 'error');
    }
}

// Create Folder
async function createFolder(folderName) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/files/create-folder`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                folderName: folderName,
                parentFolder: currentFolder 
            })
        });
        
        const data = await res.json();
        if (data.success) {
            showNotification('Folder created');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error creating folder', 'error');
    }
}

// Open Editor for reading
async function openEditor(filename, event) {
    event.stopPropagation();
    const token = localStorage.getItem('token');
    const filePath = currentFolder ? `${currentFolder}/${filename}` : filename;
    
    try {
        const res = await fetch(`${API_URL}/files/read-text?filename=${encodeURIComponent(filePath)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('editorTitle').innerText = 'Edit Text File';
            document.getElementById('editorFilename').value = filename;
            document.getElementById('editorFilename').disabled = true; // prevent changing name on edit
            document.getElementById('editorContent').value = data.content;
            document.getElementById('editorModal').classList.add('active');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to read file', 'error');
    }
}

// Save Text File
async function saveTextFile(filename, content) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/files/save-text`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                filename, 
                content, 
                folder: currentFolder 
            })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Text file saved');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to save text file', 'error');
    }
}

// Open Share Modal
function openShare(filename, event) {
    event.stopPropagation();
    const filePath = currentFolder ? `${currentFolder}/${filename}` : filename;
    document.getElementById('shareItemName').innerText = `Sharing: ${filename}`;
    document.getElementById('confirmShareBtn').dataset.itemPath = filePath;
    document.getElementById('shareTargetUser').value = '';
    document.getElementById('shareModal').classList.add('active');
}

// Share Item
async function shareItem(itemPath, targetUser) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/files/share`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ itemPath, targetUser })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Item shared successfully');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to share item', 'error');
    }
}

// Open Copy Modal
function openCopy(filename, event) {
    event.stopPropagation();
    const sourcePath = currentFolder ? `${currentFolder}/${filename}` : filename;
    document.getElementById('copyItemName').innerText = `Copying: ${filename}`;
    document.getElementById('confirmCopyBtn').dataset.sourcePath = sourcePath;
    
    // Auto-suggest a target name
    const parts = filename.split('.');
    let newTargetName = filename + ' - Copy';
    if (parts.length > 1 && parts[0] !== '') {
        const ext = parts.pop();
        newTargetName = parts.join('.') + ' - Copy.' + ext;
    }
    const targetPath = currentFolder ? `${currentFolder}/${newTargetName}` : newTargetName;
    
    document.getElementById('copyTargetName').value = targetPath;
    document.getElementById('copyModal').classList.add('active');
}

// Copy Item
async function copyItem(sourcePath, targetPath) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/files/copy`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sourcePath, targetPath })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Item copied successfully');
        } else {
            showNotification(data.msg, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to copy item', 'error');
    }
}

// Toggle Star
async function toggleStar(filename, event) {
    event.stopPropagation();
    const token = localStorage.getItem('token');
    const filePath = currentFolder ? `${currentFolder}/${filename}` : filename;
    
    try {
        const res = await fetch(`${API_URL}/files/toggle-star`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filepath: filePath })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Star updated successfully');
        } else {
            showNotification('Failed to update star', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to update star', 'error');
    }
}
