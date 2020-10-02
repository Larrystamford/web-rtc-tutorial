// joins socket for https://<ip-address>
const socket = io('/')

const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '9000'
})

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

  // when someone new joins, they will call the user
  myPeer.on('call', call => {
    console.log(call, 'calling')
    // user answers the call with an A/V stream.
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      // Show stream in some video/canvas element.
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {
    console.log(`connecting a new user, ${userId}, that has just joined us `)
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})


function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
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