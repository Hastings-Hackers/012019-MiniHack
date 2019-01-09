'use strict';

const videoElement = document.querySelector('video');
const canvasElement = document.getElementById('canvas');
const modifiedCanvasElement = document.getElementById('modified-canvas');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
const context = canvasElement.getContext('2d');
const modifiedContext = modifiedCanvasElement.getContext('2d');

const block = 8;
const chunks = block*block;


let renderTimer = null;

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);

function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
      })
      .catch(error => {
        let errorMessage = error;
        if (error.name === 'SecurityError') {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
  }
  else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;

 var blocksX = Math.ceil(videoElement.width/block);
 var blocksY = Math.ceil(videoElement.height/block);



    if (renderTimer) {
    clearInterval(renderTimer);
  }

  let i=0
  let j=0

  renderTimer = setInterval(function() {
    try {
      context.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);


            let imageData = context.getImageData((i*block), (j*block), block, block);

            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;

             for (let k=0; k<imageData.data.length; k+=4) {
                r += imageData.data[k];
                g += imageData.data[k+1];
                b += imageData.data[k+2];
                a += imageData.data[k+3];
             } 

             //average

             r = r/chunks;
             g = g/chunks;
             b = b/chunks;
             a = a/chunks;

             let newImageData = [];

             for (let k=0; k<imageData.data.length; k+=4) {
              newImageData[k] = r;
              newImageData[k+1] = g;
              newImageData[k+2] = b;
              newImageData[k+3] = a;
             } 

              modifiedContext.putImageData(new ImageData(new Uint8ClampedArray(newImageData), block, block), (i*block), (j*block));
          
        if (i<blocksX) {i++} else {i=0}
        if (j<blocksY) {j++} else { j=0 }
    } catch (e) {
      console.error(e);
    }
  }, Math.round(1));

  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function start() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  const audioSource = audioInputSelect.value;

  const videoSource = videoSelect.value;

  const constraints = {
    video: {deviceId: videoSource ? {exact: videoSource} : undefined, width: { exact: 640 }, height: { exact: 640 }}
  };

  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;

videoSelect.onchange = start;

start();
