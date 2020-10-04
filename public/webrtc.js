// joins socket for https://<ip-address>
const socket = io('/')

// public stun server for example only
// const configuration = {
//     'iceServers': [
//         { 'urls': 'stun:stun.stunprotocol.org:3478' },
//         { 'urls': 'stun:stun.l.google.com:19302' },
//     ]
// };
const peerConnection = new RTCPeerConnection(null);
const userId = createUUID();
console.log(peerConnection)
console.log(userId)

const videoGrid = document.getElementById('video-grid')

const peers = {}

const myVideo = document.createElement('video')
myVideo.muted = true

console.log(`${userId} is now joining ${ROOM_ID}`)
// informs server that a new user has just joined the room
socket.emit('join-room', ROOM_ID, userId)
// server then confirms it and broadcasts that the new user has successfully joined the room with socket on 'new-user-entered'

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    // stream is an object with params like id, active and getTracks()
    // adding own video stream on the front end
    addVideoStream(myVideo, stream)

    peerConnection.addStream(stream)



    // this is called when the next user onwards join the room 
    socket.on('new-user-entered', userId => {
        console.log(`a new user, ${userId}, has just joined the room, calling user now `, Date.now())
        // call the new user
        callAndConnectNewUser()
    })

    // when a user receives a call offer
    socket.on('offer', (message) => {
        console.log('call offer received ', message)
        peerConnection.setRemoteDescription(message)
            .then(() => peerConnection.createAnswer())
            .then((sdp) => peerConnection.setLocalDescription(sdp))
            .then(() => {
                socket.emit('answer', peerConnection.localDescription, userId)
            })
    })

    // Listen for remote ICE candidates and add them to the local RTCPeerConnection
    socket.on('new-ice-candidate', candidate => {
        try {
            peerConnection.addIceCandidate(candidate);
            console.log('ice candidate added')
            socket.emit('ready-to-stream', stream.id)
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    });

    // Listen for local ICE candidates on the local RTCPeerConnection
    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            console.log('sending new ice candidate')
            socket.emit('new-ice-candidate', event.candidate);
        }
    });

    // Listen for ready to stream signal
    socket.on('ready-to-stream', remoteStreamId => {
        try {
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

    // when a user receives a phone call
    // peerConnection.on('call', call => {
    //     // answers the call with their A/V stream.
    //     console.log(`Receiving a call`)
    //     console.log(`answering the call and returning my stream at time: ${Date.now()}`)
    //     call.answer(stream)
    //     const video = document.createElement('video')
    //     call.on('stream', userVideoStream => {
    //         // Show stream in some video/canvas element.
    //         addVideoStream(video, userVideoStream)
    //     })
    // })
})

socket.on('user-disconnected', userId => {
    // close the call
    if (peers[userId]) peers[userId].close()
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

    socket.on('answer', (message, userId) => {
        try {
            console.log('received answer ', message, userId, Date.now())
            peerConnection.setRemoteDescription(message)
        } catch (err) {
            console.log(err)
        }
    })


    // socket.emit('call-remote', userId, stream)
    // socket.on('receive-remote', ROOM_ID, userId)

    // const call = peerConnection.call(userId, stream)
    // const video = document.createElement('video')
    // call.on('stream', userVideoStream => {
    //     console.log(`Callee answered and returned stream at time: ${Date.now()}`)
    //     addVideoStream(video, userVideoStream)
    // })
    // call.on('close', () => {
    //     video.remove()
    // })

    // peers[userId] = call
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