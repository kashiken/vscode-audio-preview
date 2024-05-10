import { EventType } from "../../events";
import {
  createAudioContext,
  getRandomFloat,
  getRandomInt,
} from "../../../__mocks__/helper";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import PlayerService from "../../services/playerService";
import AnalyzerComponent from "./analyzerComponent";

describe("analyserComponent", () => {
  let audioBuffer: AudioBuffer;
  let analyzeSettingsService: AnalyzeSettingsService;
  let analyzerComponent: AnalyzerComponent;
  beforeAll(() => {
    document.body.innerHTML = '<div id="analyzer"></div>';
    const audioContext = createAudioContext(44100);
    audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const playerService = new PlayerService(audioContext, audioBuffer);
    analyzerComponent = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
  });

  afterAll(() => {
    analyzerComponent.dispose();
  });

  test("analyzer should have analyze-button", () => {
    expect(document.querySelector(".analyzeButton")).toBeTruthy();
  });

  test("analyzer should have analyze-setting-button", () => {
    expect(document.querySelector(".analyzeSettingButton")).toBeTruthy();
  });

  test("analyzer should have analyze-setting", () => {
    expect(document.querySelector(".analyzeSetting")).toBeTruthy();
  });

  test("display of analyze-setting should be controled by analyze-setting-button", () => {
    const analyzeSetting = document.querySelector(
      ".analyzeSetting",
    ) as HTMLElement;
    const analyzeSettingButton = document.querySelector(
      ".analyzeSettingButton",
    );
    // at first, analyze-setting should be hidden
    expect(analyzeSetting?.style.display).toBe("none");
    // control display by clicking analyze-setting-button
    analyzeSettingButton?.dispatchEvent(new Event("click"));
    expect(analyzeSetting?.style.display).toBe("block");
    analyzeSettingButton?.dispatchEvent(new Event("click"));
    expect(analyzeSetting?.style.display).toBe("none");
  });

  test("figures in analyze-result-box should be created after analyze", () => {
    analyzerComponent.analyze();
    const figures = document
      .querySelector(".analyzeResultBox")
      ?.querySelectorAll("canvas");
    // figures: waveform+axis and spectrogram+axis for each channels
    expect(figures.length).toBe(audioBuffer.numberOfChannels * 4);
  });

  test("seek-bar on the figures should be created after analyze", () => {
    analyzerComponent.analyze();
    expect(document.querySelector(".seekDiv")).toBeTruthy();
    expect(document.querySelector(".inputSeekBar")).toBeTruthy();
  });

  test("waveform-visible should be updated when recieving update-waveform-visible event", () => {
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_WAVEFORM_VISIBLE, {
        detail: {
          value: true,
        },
      }),
    );
    const waveformVisible = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-waveformVisible")
    );
    expect(waveformVisible.checked).toBe(true);

    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_WAVEFORM_VISIBLE, {
        detail: {
          value: false,
        },
      }),
    );
    expect(waveformVisible.checked).toBe(false);
  });

  test("spectrogram-visible should be updated when recieving update-spectrogram-visible event", () => {
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_SPECTROGRAM_VISIBLE, {
        detail: {
          value: true,
        },
      }),
    );
    const spectrogramVisible = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-spectrogramVisible")
    );
    expect(spectrogramVisible.checked).toBe(true);

    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_SPECTROGRAM_VISIBLE, {
        detail: {
          value: false,
        },
      }),
    );
    expect(spectrogramVisible.checked).toBe(false);
  });

  test("window size should be updated when user change window-size-select", () => {
    const index = getRandomInt(0, 7);
    const windowSize = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768][index];
    const windowSizeSelect = <HTMLSelectElement>(
      document.querySelector(".js-analyzeSetting-windowSize")
    );
    windowSizeSelect.selectedIndex = index;
    windowSizeSelect.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.windowSize).toBe(windowSize);
  });
  test("window-size-select should be updated when recieving update-window-size-index event", () => {
    const index = getRandomInt(0, 7);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_WINDOW_SIZE_INDEX, {
        detail: {
          value: index,
        },
      }),
    );
    const windowSizeSelect = <HTMLSelectElement>(
      document.querySelector(".js-analyzeSetting-windowSize")
    );
    expect(windowSizeSelect.selectedIndex).toBe(index);
  });

  test("frequency scale should be updated when user change frequency-scale-select", () => {
    const frequencyScale = getRandomInt(0, 2);
    const frequencyScaleSelect = <HTMLSelectElement>(
      document.querySelector(".js-analyzeSetting-frequencyScale")
    );
    frequencyScaleSelect.selectedIndex = frequencyScale;
    frequencyScaleSelect.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.frequencyScale).toBe(frequencyScale);
  });
  test("frequency-scale-select should be updated when recieving update-frequency-scale event", () => {
    const frequencyScale = getRandomInt(0, 2);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_FREQUENCY_SCALE, {
        detail: {
          value: frequencyScale,
        },
      }),
    );
    const frequencyScaleSelect = <HTMLSelectElement>(
      document.querySelector(".js-analyzeSetting-frequencyScale")
    );
    expect(frequencyScaleSelect.selectedIndex).toBe(frequencyScale);
  });

  test("mel-filter-num should be updated when user change mel-filter-num-input", () => {
    const melFilterNum = getRandomFloat(20, 200);
    const melFilterNumInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-melFilterNum")
    );
    melFilterNumInput.value = melFilterNum.toString();
    melFilterNumInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.melFilterNum).toBe(Math.trunc(melFilterNum));
  });
  test("mel-filter-num-input should be updated when recieving update-mel-filter-num event", () => {
    const melFilterNum = getRandomFloat(20, 200);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MEL_FILTER_NUM, {
        detail: {
          value: melFilterNum,
        },
      }),
    );
    const melFilterNumInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-melFilterNum")
    );
    expect(Number(melFilterNumInput.value)).toBe(melFilterNum);
  });

  test("min-frequency should be updated when user change min-frequency-input", () => {
    const minFrequency = getRandomFloat(0, audioBuffer.sampleRate / 2);
    const minFrequencyInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minFrequency")
    );
    minFrequencyInput.value = minFrequency.toString();
    minFrequencyInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.minFrequency).toBeCloseTo(minFrequency);
  });
  test("min-frequency-input should be updated when recieving update-min-frequency event", () => {
    const minFrequency = getRandomFloat(0, audioBuffer.sampleRate / 2);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MIN_FREQUENCY, {
        detail: {
          value: minFrequency,
        },
      }),
    );
    const minFrequencyInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minFrequency")
    );
    expect(Number(minFrequencyInput.value)).toBeCloseTo(minFrequency);
  });

  test("max-frequency should be updated when user change max-frequency-input", () => {
    const maxFrequency = getRandomFloat(
      analyzeSettingsService.minFrequency,
      audioBuffer.sampleRate / 2,
    );
    const maxFrequencyInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxFrequency")
    );
    maxFrequencyInput.value = maxFrequency.toString();
    maxFrequencyInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.maxFrequency).toBeCloseTo(maxFrequency);
  });
  test("max-frequency-input should be updated when recieving update-max-frequency event", () => {
    const maxFrequency = getRandomFloat(
      analyzeSettingsService.minFrequency,
      audioBuffer.sampleRate / 2,
    );
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MAX_FREQUENCY, {
        detail: {
          value: maxFrequency,
        },
      }),
    );
    const maxFrequencyInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxFrequency")
    );
    expect(Number(maxFrequencyInput.value)).toBeCloseTo(maxFrequency);
  });

  test("min-time should be updated when user change min-time-input", () => {
    const minTime = getRandomFloat(0, audioBuffer.duration);
    const minTimeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minTime")
    );
    minTimeInput.value = minTime.toString();
    minTimeInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.minTime).toBeCloseTo(minTime);
  });
  test("min-time-input should be updated when recieving update-min-time event", () => {
    const minTime = getRandomFloat(0, audioBuffer.duration);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MIN_TIME, {
        detail: {
          value: minTime,
        },
      }),
    );
    const minTimeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minTime")
    );
    expect(Number(minTimeInput.value)).toBeCloseTo(minTime);
  });

  test("max-time should be updated when user change max-time-input", () => {
    const maxTime = getRandomFloat(
      analyzeSettingsService.minTime,
      audioBuffer.duration,
    );
    const maxTimeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxTime")
    );
    maxTimeInput.value = maxTime.toString();
    maxTimeInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.maxTime).toBeCloseTo(maxTime);
  });
  test("max-time-input should be updated when recieving update-max-time event", () => {
    const maxTime = getRandomFloat(
      analyzeSettingsService.minTime,
      audioBuffer.duration,
    );
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MAX_TIME, {
        detail: {
          value: maxTime,
        },
      }),
    );
    const maxTimeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxTime")
    );
    expect(Number(maxTimeInput.value)).toBeCloseTo(maxTime);
  });

  test("min-amplitude should be updated when user change min-amplitude-input", () => {
    const minAmplitude = getRandomFloat(
      -1,
      analyzeSettingsService.maxAmplitude,
    );
    const minAmplitudeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minAmplitude")
    );
    minAmplitudeInput.value = minAmplitude.toString();
    minAmplitudeInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.minAmplitude).toBeCloseTo(minAmplitude);
  });
  test("min-amplitude-input should be updated when recieving update-min-amplitude event", () => {
    const minAmplitude = getRandomFloat(
      -1,
      analyzeSettingsService.maxAmplitude,
    );
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MIN_AMPLITUDE, {
        detail: {
          value: minAmplitude,
        },
      }),
    );
    const minAmplitudeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-minAmplitude")
    );
    expect(Number(minAmplitudeInput.value)).toBeCloseTo(minAmplitude);
  });

  test("max-amplitude should be updated when user change max-amplitude-input", () => {
    const maxAmplitude = getRandomFloat(analyzeSettingsService.minAmplitude, 1);
    const maxAmplitudeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxAmplitude")
    );
    maxAmplitudeInput.value = maxAmplitude.toString();
    maxAmplitudeInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.maxAmplitude).toBeCloseTo(maxAmplitude);
  });
  test("max-amplitude-input should be updated when recieving update-max-amplitude event", () => {
    const maxAmplitude = getRandomFloat(analyzeSettingsService.minAmplitude, 1);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_MAX_AMPLITUDE, {
        detail: {
          value: maxAmplitude,
        },
      }),
    );
    const maxAmplitudeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-maxAmplitude")
    );
    expect(Number(maxAmplitudeInput.value)).toBeCloseTo(maxAmplitude);
  });

  test("spectrogram-amplitude-range should be updated when user change spectrogram-amplitude-range-input", () => {
    const spectrogramAmplitudeRange = getRandomFloat(-90, 0);
    const spectrogramAmplitudeRangeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-spectrogramAmplitudeRange")
    );
    spectrogramAmplitudeRangeInput.value = spectrogramAmplitudeRange.toString();
    spectrogramAmplitudeRangeInput.dispatchEvent(new Event(EventType.CHANGE));
    expect(analyzeSettingsService.spectrogramAmplitudeRange).toBeCloseTo(
      spectrogramAmplitudeRange,
    );
  });
  test("spectrogram-amplitude-range-input should be updated when recieving update-spectrogram-amplitude-range event", () => {
    const spectrogramAmplitudeRange = getRandomFloat(-90, 0);
    analyzeSettingsService.dispatchEvent(
      new CustomEvent(EventType.AS_UPDATE_SPECTROGRAM_AMPLITUDE_RANGE, {
        detail: {
          value: spectrogramAmplitudeRange,
        },
      }),
    );
    const spectrogramAmplitudeRangeInput = <HTMLInputElement>(
      document.querySelector(".js-analyzeSetting-spectrogramAmplitudeRange")
    );
    expect(Number(spectrogramAmplitudeRangeInput.value)).toBeCloseTo(
      spectrogramAmplitudeRange,
    );
  });
});

describe("auto analyze", () => {
  test("analyzer should start analyze if autoAnalyze is true", () => {
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    const analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const playerService = new PlayerService(audioContext, audioBuffer);
    const ac = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      true,
    );
    expect(
      document.querySelector(".analyzeResultBox")?.querySelectorAll("canvas")
        .length,
    ).toBe(8);
    ac.dispose();
  });

  test("analyzer should not start analyze if autoAnalyze is false", () => {
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    const analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const playerService = new PlayerService(audioContext, audioBuffer);
    const ac = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
    expect(
      document.querySelector(".analyzeResultBox")?.querySelectorAll("canvas")
        .length,
    ).toBe(0);
    ac.dispose();
  });
});

describe("position of seek-bar should be updated when recieving update-seekbar event", () => {
  let analyzeSettingsService: AnalyzeSettingsService;
  let playerService: PlayerService;
  let analyzerComponent: AnalyzerComponent;

  beforeAll(() => {
    document.body.innerHTML = '<div id="analyzer"></div>';
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 441000, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    playerService = new PlayerService(audioContext, audioBuffer);
    analyzeSettingsService.minTime = 2;
    analyzeSettingsService.maxTime = 6;
    // audio: 10s, minTime: 2s, maxTime: 6s
    analyzerComponent = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
    analyzerComponent.analyze();
  });

  afterAll(() => {
    analyzerComponent.dispose();
    playerService.dispose();
  });

  test("value: 50(5s), position: 75%", () => {
    const visibleSeekbar = <HTMLInputElement>document.querySelector(".seekDiv");
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 50,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("75%");
  });

  test("value: 5(0.5s), position: 0%", () => {
    const visibleSeekbar = <HTMLInputElement>document.querySelector(".seekDiv");
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 5,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("0%");
  });

  test("value: 90(9s), position: 100%", () => {
    const visibleSeekbar = <HTMLInputElement>document.querySelector(".seekDiv");
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 90,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("100%");
  });
});