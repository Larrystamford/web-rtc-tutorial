// joins socket for https://<ip-address>
const socket = io('/')

//RTC configs
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
const myId = createUUID();
peerConnections = {};
const mediaTracks = []
var mediaStream

//Video grid
const videoGrid = document.getElementById('video-grid')
const myVideo = document.createElement('video')
const videoStreams = []
myVideo.muted = true
videoGrid.append(myVideo)


console.log(`${myId} is now joining ${ROOM_ID}`)
// informs server that a new user has just joined the room
socket.emit('join-room', ROOM_ID, myId)
// server then confirms it and broadcasts that the new user has successfully joined the room with socket on 'another-user-entered'
document.getElementById("stream-button").addEventListener("click", ()=>
    {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(stream => {
            // stream is an object with params like id, active and getTracks()
            // adding own video stream on the front end
            updateLocalVideoStream(stream)

            //adding video stream to RTC peer connection
            stream.getTracks().forEach(track => mediaTracks.push(track))
            mediaStream = stream
            for (var conn in peerConnections) {
                mediaTracks.forEach(track => peerConnections[conn].addTrack(track, mediaStream))
            }
        })
    }
)

////////////////////////////////////////////////

// this is called when the another user joins the room
socket.on('another-user-entered', newUser => {
    console.log(`a new user, ${newUser}, has just joined the room, calling user now at time `, Date.now())
    // call the new user and send over relevant information to the callee
    CreateNewRTCConnection(newUser)
    createOfferAndAwaitAnswer(newUser)
})

// Receiving a call, answer the call, take relevant information from caller, send relevant information back to the caller
socket.on('offer', (message, offerer, checker) => {
    if(checker === myId) {
        console.log(`Offer received from ${offerer} with the following message `, message)
        receiveOfferAndAnswerCall(message, offerer)
    }
})

// Listen for remote ICE candidates and add them to the local RTCPeerConnection
socket.on('new-ice-candidate', (candidate, targetId, checker) => {
    if(checker === myId) {
        if(!(targetId in peerConnections)){
            CreateNewRTCConnection(targetId)
            createOfferAndAwaitAnswer(targetId)
        }
        try {
            peerConnections[targetId].addIceCandidate(candidate);
            console.log(`adding ice candidate to ${targetId} at time `, Date.now())
            //socket.emit('ready-to-stream', stream.id)
        } catch (e) {
            console.error(`Error adding received ice candidate to ${targetId}`, e);
        }
    }
});

socket.on('user-disconnected', (targetId) => {
    if(targetId in peerConnections){
        console.log(`Disconnecting ${targetId}...`)
        peerConnections[targetId].close()
        delete peerConnections[targetId]
        closeVideoStream(targetId)
    }
})


///////////////////////////////////////////////////////////

function CreateNewRTCConnection(newUser){
    // Create connection
    console.log(`creating new RTC connection with ${newUser}`)
    peerConnections[newUser] = new RTCPeerConnection(configuration)
    // Add media tracks to send over
    mediaTracks.forEach(track => peerConnections[newUser].addTrack(track, mediaStream))
    //TODO
    if(mediaStream != null){
        peerConnections[newUser].addStream(mediaStream)
    }
    // Create new video box
    addNewVideoDisplay(newUser)
    peerConnections[newUser].ontrack = function(event){
        console.log(`On Track triggered for connection with ${newUser}`)
        if(event.track.kind === 'video') {
            event.track.onunmute = () => {
                console.log(`Video Track added for connection with ${newUser}`)
                console.log(event.streams.length)
                playVideoStream(newUser, event.streams[0])
            }
        }
    }

    // As ICE Candidates are discovered, event will be fired off to update other party
    peerConnections[newUser].addEventListener('icecandidate', event => {
        if (event.candidate) {
            console.log(`sending new ice candidate to ${newUser} at time `, Date.now())
            socket.emit('new-ice-candidate', event.candidate, myId, newUser);
        }
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnections[newUser].addEventListener('connectionstatechange', event => {
        console.log(`Connection State with peer ${newUser}: `, peerConnections[newUser].connectionState)
    });

    peerConnections[newUser].onnegotiationneeded = event => {
        console.log(`Renegotiating connection with ${newUser}`)
        createOfferAndAwaitAnswer(newUser)
    }
}

function createOfferAndAwaitAnswer(newUser) {

    // Create offer
    console.log(`Offering ${newUser} at time: ${Date.now()}`)
    // SDP - Session Description Protocol
    // Contains everything peer needs to connect
    peerConnections[newUser].createOffer()
        .then((sdp) => peerConnections[newUser].setLocalDescription(sdp))
        .then(() => {
            socket.emit('offer', peerConnections[newUser].localDescription, myId, newUser)
        })

    console.log(`local description for ${newUser} set at time `, Date.now())

    socket.on('answer', (message, targetId, checker) => {
        if(checker === myId) {
            try {
                console.log(`received answer from ${targetId} with the following message `, message)
                peerConnections[targetId].setRemoteDescription(message)
                console.log(`remote description for ${targetId} set at time `, Date.now())
            } catch (err) {
                console.log(err)
            }
        }
    })
}

function receiveOfferAndAnswerCall(message, offerer) {
    if (!(offerer in peerConnections)){
        CreateNewRTCConnection(offerer)
    }

    peerConnections[offerer].setRemoteDescription(message)
        .then(() => peerConnections[offerer].createAnswer())
        .then((sdp) => peerConnections[offerer].setLocalDescription(sdp))
        .then(() => {
            socket.emit('answer', peerConnections[offerer].localDescription, myId, offerer)
        })

    console.log(`local description for ${offerer} set at time `, Date.now())
    console.log(`remote description for ${offerer} set at time `, Date.now())
}

function addNewVideoDisplay(targetId){
    console.log(`Creating new Video Display for ${targetId}`)
    videoStreams[targetId] = document.createElement('video')
    videoGrid.append(videoStreams[targetId])
}

// adds the video to the front end grid
function playVideoStream(targetId, stream) {
    videoStreams[targetId].srcObject = stream
    videoStreams[targetId].controls = true
    videoStreams[targetId].muted = true
    videoStreams[targetId].autoplay = true
    videoStreams[targetId].addEventListener('loadedmetadata', () => {
        videoStreams[targetId].play()
    })
}

// adds the video to the front end grid
function updateLocalVideoStream(stream) {
    myVideo.srcObject = stream
    myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play()
    })
}

function closeVideoStream(targetId){
    videoStreams[targetId].remove()
    delete videoStreams[targetId]
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}