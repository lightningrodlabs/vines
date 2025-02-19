

export const MIC_MIME_TYPE = 'audio/webm; codecs=opus';

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private _isRecording = false;

  get isRecording(): boolean {return this._isRecording;}

  async initialize(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: MIC_MIME_TYPE
      });

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });

    } catch (error) {
      console.error('Error initializing audio recorder:', error);
      throw error;
    }
  }


  startRecording(): void {
    if (!this.mediaRecorder || this._isRecording) {
      console.warn("startRec() aborted. Already recording");
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start();
    this._isRecording = true;
  }


  stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || !this._isRecording) {
      return Promise.reject(new Error('Not recording'));
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { type: MIC_MIME_TYPE });
        this.audioChunks = [];
        resolve(audioBlob);
      }, { once: true });

      this.mediaRecorder!.stop();
      this._isRecording = false;
    });
  }


  /** */
  save(audioBlob: Blob) {
    try {
      // Save the file
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recording.opus';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }
}


