class MeetingRoom {
    constructor(meetingId, userName) {
        this.meetingId = meetingId;
        this.userName = userName;
        this.localStream = null;
        this.peerConnections = {};
        this.participants = new Set();
        
        this.videoEnabled = true;
        this.audioEnabled = true;
        
        this.initializeMediaDevices();
        this.setupEventListeners();
    }
    
    async initializeMediaDevices() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                localVideo.muted = true;
            }
            
            this.updateMediaStatus();
            this.showNotification('Camera and microphone connected', 'success');
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.showNotification('Could not access camera/microphone. Please check permissions.', 'error');
        }
    }
    
    setupEventListeners() {
        const toggleVideoBtn = document.getElementById('toggle-video');
        const toggleAudioBtn = document.getElementById('toggle-audio');
        const endCallBtn = document.getElementById('end-call');
        const shareScreenBtn = document.getElementById('share-screen');
        
        if (toggleVideoBtn) {
            toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        }
        
        if (toggleAudioBtn) {
            toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
        }
        
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => this.endCall());
        }
        
        if (shareScreenBtn) {
            shareScreenBtn.addEventListener('click', () => this.shareScreen());
        }
    }
    
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.videoEnabled = !this.videoEnabled;
                videoTrack.enabled = this.videoEnabled;
                this.updateMediaStatus();
                
                const btn = document.getElementById('toggle-video');
                const icon = btn.querySelector('i');
                if (this.videoEnabled) {
                    btn.classList.remove('btn-danger');
                    btn.classList.add('btn-secondary');
                    icon.classList.remove('fa-video-slash');
                    icon.classList.add('fa-video');
                } else {
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-danger');
                    icon.classList.remove('fa-video');
                    icon.classList.add('fa-video-slash');
                }
            }
        }
    }
    
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.audioEnabled = !this.audioEnabled;
                audioTrack.enabled = this.audioEnabled;
                this.updateMediaStatus();
                
                const btn = document.getElementById('toggle-audio');
                const icon = btn.querySelector('i');
                if (this.audioEnabled) {
                    btn.classList.remove('btn-danger');
                    btn.classList.add('btn-secondary');
                    icon.classList.remove('fa-microphone-slash');
                    icon.classList.add('fa-microphone');
                } else {
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-danger');
                    icon.classList.remove('fa-microphone');
                    icon.classList.add('fa-microphone-slash');
                }
            }
        }
    }
    
    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });
            
            const screenTrack = screenStream.getVideoTracks()[0];
            
            const videoTrack = this.localStream.getVideoTracks()[0];
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(screenTrack);
            
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            screenTrack.onended = () => {
                this.localStream.removeTrack(screenTrack);
                this.localStream.addTrack(videoTrack);
                if (localVideo) {
                    localVideo.srcObject = this.localStream;
                }
            };
            
            this.showNotification('Screen sharing started', 'success');
        } catch (error) {
            console.error('Error sharing screen:', error);
            this.showNotification('Could not share screen', 'error');
        }
    }
    
    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        Object.values(this.peerConnections).forEach(pc => pc.close());
        
        window.location.href = document.referrer || '/';
    }
    
    updateMediaStatus() {
        const statusDiv = document.getElementById('media-status');
        if (statusDiv) {
            const videoStatus = this.videoEnabled ? 
                '<i class="fas fa-video text-success"></i> Video On' : 
                '<i class="fas fa-video-slash text-danger"></i> Video Off';
            const audioStatus = this.audioEnabled ? 
                '<i class="fas fa-microphone text-success"></i> Audio On' : 
                '<i class="fas fa-microphone-slash text-danger"></i> Audio Off';
            statusDiv.innerHTML = `${videoStatus} | ${audioStatus}`;
        }
    }
    
    showNotification(message, type) {
        const container = document.getElementById('notification-container');
        if (container) {
            const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
            const notification = document.createElement('div');
            notification.className = `alert ${alertClass} alert-dismissible fade show`;
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
    
    addParticipant(participantId, participantName) {
        this.participants.add(participantId);
        this.updateParticipantsList();
    }
    
    removeParticipant(participantId) {
        this.participants.delete(participantId);
        this.updateParticipantsList();
    }
    
    updateParticipantsList() {
        const listElement = document.getElementById('participants-list');
        if (listElement) {
            listElement.innerHTML = '';
            this.participants.forEach(participant => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex align-items-center';
                li.innerHTML = `
                    <div class="avatar me-2">
                        <i class="fas fa-user-circle fa-2x text-primary"></i>
                    </div>
                    <span>${participant}</span>
                `;
                listElement.appendChild(li);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const meetingContainer = document.getElementById('meeting-container');
    if (meetingContainer) {
        const meetingId = meetingContainer.dataset.meetingId;
        const userName = meetingContainer.dataset.userName;
        
        if (meetingId && userName) {
            window.meetingRoom = new MeetingRoom(meetingId, userName);
        }
    }
});
