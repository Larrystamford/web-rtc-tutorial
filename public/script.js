// joins socket for https://<ip-address>
const socket = io('/')

const videoGrid = document.getElementById('video-grid')
const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
const peerConnection = new RTCPeerConnection(configuration);
const peers = {}

const myVideo = document.createElement('video')
myVideo.muted = true

myPeer.on('open', id => {
  console.log(`${id} is now joining ${ROOM_ID}`)
  // informs server that a new user has just joined the room
  socket.emit('join-room', ROOM_ID, id)
  // server then confirms it and broadcasts that the new user has successfully joined the room with socket on 'user-connected'
})

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  // stream is an object with params like id, active and getTracks()
  // adding own video stream on the front end
  addVideoStream(myVideo, stream)

  // this is called when the next user onwards join the room 
  socket.on('user-connected', userId => {
    console.log(`a new user, ${userId}, has just joined the room, calling user now `, Date.now())
    // call the new user
    callAndConnectNewUser(userId, stream)
  })

  // when a user receives a phone call
  myPeer.on('call', call => {
    // answers the call with their A/V stream.
    console.log(`Receiving a call`)
    console.log(`answering the call and returning my stream at time: ${Date.now()}`)
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      // Show stream in some video/canvas element.
      addVideoStream(video, userVideoStream)
    })
  })
})

socket.on('user-disconnected', userId => {
  // close the call
  if (peers[userId]) peers[userId].close()
})


function callAndConnectNewUser(userId, stream) {
  console.log(`calling new user at time: ${Date.now()}`)
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    console.log(`Callee answered and returned stream at time: ${Date.now()}`)
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}



// adds the video to the front end grid
function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}