import { EventType } from "../events";
import Service from "../service";
import PlayerSettingsService from "./playerSettingsService";

export default class PlayerService extends Service {
  private _audioContext: AudioContext;
  private _audioBuffer: AudioBuffer;
  private _playerSettingService: PlayerSettingsService;

  private _isPlaying: boolean = false;
  private _lastStartAcTime: number = 0;
  private _currentSec: number = 0;
  private _source: AudioBufferSourceNode;

  public get isPlaying() {
    return this._isPlaying;
  }
  public get currentSec() {
    return this._currentSec;
  }

  private _gainNode: GainNode;
  // volume is 0~1
  public get volume() {
    if (!this._gainNode) {
      return 1;
    }
    return this._gainNode.gain.value;
  }
  public set volume(value: number) {
    if (!this._gainNode) {
      return;
    }
    this._gainNode.gain.value = value;
  }

  private _seekbarValue: number = 0;
  private _animationFrameID: number = 0;

  constructor(
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
    playerSettingService: PlayerSettingsService,
  ) {
    super();
    this._audioContext = audioContext;
    this._audioBuffer = audioBuffer;
    this._playerSettingService = playerSettingService;

    // init volume
    this._gainNode = this._audioContext.createGain();
    this._gainNode.connect(this._audioContext.destination);
  }

  public play() {
    // create audioBufferSourceNode every time,
    // because audioBufferSourceNode.start() can't be called more than once.
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
    this._source = this._audioContext.createBufferSource();
    this._source.buffer = this._audioBuffer;
    this._source.connect(this._gainNode);

    // play
    this._isPlaying = true;
    this._lastStartAcTime = this._audioContext.currentTime;
    this._source.start(this._audioContext.currentTime, this._currentSec);

    // update playing status
    this.dispatchEvent(
      new CustomEvent(EventType.UPDATE_IS_PLAYING, {
        detail: {
          value: this._isPlaying,
        },
      }),
    );

    // move seek bar
    this._animationFrameID = requestAnimationFrame(() => this.tick());
  }

  public pause() {
    // stop seek bar
    cancelAnimationFrame(this._animationFrameID);

    // pause
    this._source.stop();
    this._currentSec += this._audioContext.currentTime - this._lastStartAcTime;
    this._isPlaying = false;
    this._source = undefined;

    // update playing status
    this.dispatchEvent(
      new CustomEvent(EventType.UPDATE_IS_PLAYING, {
        detail: {
          value: this._isPlaying,
        },
      }),
    );
  }

  public tick() {
    const current =
      this._currentSec + this._audioContext.currentTime - this._lastStartAcTime;
    this._seekbarValue = (100 * current) / this._audioBuffer.duration;

    // update seek bar value
    this.dispatchEvent(
      new CustomEvent(EventType.UPDATE_SEEKBAR, {
        detail: {
          value: this._seekbarValue,
          pos: current,
        },
      }),
    );

    // pause if finish playing
    if (current > this._audioBuffer.duration) {
      this.pause();
      // reset current time
      this._currentSec = 0;
      this._seekbarValue = 0;
      return;
    }

    if (this._isPlaying) {
      this._animationFrameID = requestAnimationFrame(() => this.tick());
    }
  }

  // seekbar value is 0~100
  public onSeekbarInput(value: number) {
    const resumeRequired: boolean = this._isPlaying;

    if (this._isPlaying) {
      this.pause();
    }

    // update seek bar value
    this._currentSec = (value * this._audioBuffer.duration) / 100;
    this._seekbarValue = value;
    this.dispatchEvent(
      new CustomEvent(EventType.UPDATE_SEEKBAR, {
        detail: {
          value: this._seekbarValue,
          pos: this._currentSec,
        },
      }),
    );

    // restart from selected place
    if (resumeRequired || this._playerSettingService.enableSeekToPlay) {
      this.play();
    }
  }
}
