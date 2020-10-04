// joins socket for https://<ip-address>
const socket = io('/')

const peerConnection = new RTCPeerConnection(null);
const userId = createUUID();

const videoGrid = document.getElementById('video-grid')

const myVideo = document.createElement('video')
myVideo.muted = true

console.log(`${userId} is now joining ${ROOM_ID}`)
// informs server that a new user has just joined the room
socket.emit('join-room', ROOM_ID, userId)
// server then confirms it and broadcasts that the new user has successfully joined the room with socket on 'another-user-entered'

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    // stream is an object with params like id, active and getTracks()
    // adding own video stream on the front end
    addVideoStream(myVideo, stream)

    // adding video stream to RTC peer connection
    peerConnection.addStream(stream)

    // this is called when the another user joins the room 
    socket.on('another-user-entered', userId => {
        console.log(`a new user, ${userId}, has just joined the room, calling user now at time `, Date.now())
        // call the new user and send over relevant information to the callee
        callAndConnectNewUser()
    })

    // Receiving a call, answer the call, take relevant information from caller, send relevant information back to the caller
    socket.on('offer', (message) => {
        console.log('call received with the following message ', message)
        receiveAndAnswerCall(message)
    })

    // as local description is set, candidate events will fire off
    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            console.log('sending new ice candidate at time ', Date.now())
            socket.emit('new-ice-candidate', event.candidate);
        }
    });

    // Listen for remote ICE candidates and add them to the local RTCPeerConnection
    socket.on('new-ice-candidate', candidate => {
        try {
            peerConnection.addIceCandidate(candidate);
            console.log('adding ice candidate at time ', Date.now())
            socket.emit('ready-to-stream', stream.id)
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    });

    // Listen for ready to stream signal
    socket.on('ready-to-stream', remoteStreamId => {
        try {
            console.log("stream starting at time ", Date.now())
            let streams = peerConnection.getRemoteStreams();
            for (let i = 0; i < streams.length; i++) {
                if (streams[i].id == remoteStreamId) {
                    const video = document.createElement('video')
                    addVideoStream(video, streams[i])
                }
            }
        } catch (e) {
            console.error('Error trying to stream video', e);
        }
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnection.addEventListener('connectionstatechange', event => {
        console.log('Connection State: ', peerConnection.connectionState)
    });
})

function callAndConnectNewUser() {
    console.log(`calling new user at time: ${Date.now()}`)

    // SDP - Session Description Protocol
    // Contains everything peer needs to connect
    peerConnection.createOffer()
        .then((sdp) => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit('offer', peerConnection.localDescription, userId)
        })

    console.log("local description set at time ", Date.now())

    socket.on('answer', (message) => {
        try {
            console.log('received answer from callee at time ', Date.now())
            peerConnection.setRemoteDescription(message)
            console.log("remote description set at time ", Date.now())
        } catch (err) {
            console.log(err)
        }
    })
}

function receiveAndAnswerCall(message) {
    peerConnection.setRemoteDescription(message)
        .then(() => peerConnection.createAnswer())
        .then((sdp) => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit('answer', peerConnection.localDescription, userId)
        })

    console.log("local description set at time ", Date.now())
    console.log("remote description set at time ", Date.now())
}

// adds the video to the front end grid
function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}