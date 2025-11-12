export default {
  editor: {
    label: {
      en: 'Video Cut Player',
    },
    icon: 'fontawesome/solid/video',
  },
  properties: {
    videoUrl: {
      label: { en: 'Video URL' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'URL of the video file to load',
      },
      propertyHelp: 'Enter the direct URL to the video file (MP4, WebM, etc.)',
      /* wwEditor:end */
    },
    maxCutDuration: {
      label: { en: 'Max Cut Duration (seconds)' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 10,
      min: 0.5,
      max: 300,
      step: 0.5,
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Maximum allowed duration for a video cut in seconds',
      },
      propertyHelp: 'Maximum duration allowed for video cuts (0.5 to 300 seconds)',
      /* wwEditor:end */
    },
    minCutDuration: {
      label: { en: 'Min Cut Duration (seconds)' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 0.5,
      min: 0.1,
      max: 60,
      step: 0.1,
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Minimum allowed duration for a video cut in seconds',
      },
      propertyHelp: 'Minimum duration required for video cuts',
      /* wwEditor:end */
    },
    watermarkText: {
      label: { en: 'Watermark Text' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'FutLab',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Text to display as watermark overlay',
      },
      propertyHelp: 'Text that will appear as watermarks on the video',
      /* wwEditor:end */
    },
    watermarkCount: {
      label: { en: 'Number of Watermarks' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 12,
      min: 1,
      max: 50,
      step: 1,
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Number of watermark instances to display',
      },
      propertyHelp: 'How many watermark instances to show across the video',
      /* wwEditor:end */
    },
    watermarkOpacity: {
      label: { en: 'Watermark Opacity' },
      type: 'Number',
      section: 'style',
      bindable: true,
      defaultValue: 0.15,
      min: 0,
      max: 1,
      step: 0.05,
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Opacity of watermark text (0 to 1)',
      },
      propertyHelp: 'Transparency level of watermarks (0 = invisible, 1 = opaque)',
      /* wwEditor:end */
    },
    watermarkColor: {
      label: { en: 'Watermark Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#FFFFFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the watermark text',
      },
      /* wwEditor:end */
    },
    watermarkFontSize: {
      label: { en: 'Watermark Font Size' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '24px',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Font size for watermark text',
      },
      /* wwEditor:end */
    },
    showControls: {
      label: { en: 'Show Video Controls' },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show or hide native video controls',
      },
      /* wwEditor:end */
    },
    timelineHeight: {
      label: { en: 'Timeline Height' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '60px',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Height of the timeline selector',
      },
      /* wwEditor:end */
    },
    timelineColor: {
      label: { en: 'Timeline Selection Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#007AFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the selected timeline range',
      },
      /* wwEditor:end */
    },
    handleColor: {
      label: { en: 'Timeline Handle Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#FFFFFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the timeline drag handles',
      },
      /* wwEditor:end */
    },
    handleBorderColor: {
      label: { en: 'Handle Border Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#007AFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Border color of the timeline handles',
      },
      /* wwEditor:end */
    },
    handleGripColor: {
      label: { en: 'Handle Grip Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#007AFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the handle grip line',
      },
      /* wwEditor:end */
    },
    timeLabelColor: {
      label: { en: 'Time Label Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#007AFF',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the time labels',
      },
      /* wwEditor:end */
    },
    durationLabelColor: {
      label: { en: 'Duration Label Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#999999',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of the duration label',
      },
      /* wwEditor:end */
    },
    initialStartTime: {
      label: { en: 'Initial Start Time' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 0,
      min: 0,
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Initial start position in seconds',
      },
      propertyHelp: 'Starting position for the selection (in seconds)',
      /* wwEditor:end */
    },
    autoPlay: {
      label: { en: 'Auto Play' },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: false,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Automatically play video when loaded',
      },
      /* wwEditor:end */
    },
    preload: {
      label: { en: 'Preload Strategy' },
      type: 'TextSelect',
      section: 'settings',
      options: {
        options: [
          { value: 'metadata', label: 'Metadata Only' },
          { value: 'auto', label: 'Automatic' },
          { value: 'none', label: 'None' },
        ],
      },
      defaultValue: 'metadata',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Valid values: metadata | auto | none',
      },
      /* wwEditor:end */
    },
  },
  triggerEvents: [
    {
      name: 'selection-change',
      label: { en: 'On Selection Change' },
      event: {
        startTime: 0,
        endTime: 0,
        duration: 0,
      },
      default: true,
    },
    {
      name: 'video-loaded',
      label: { en: 'On Video Loaded' },
      event: {
        duration: 0,
        videoUrl: '',
      },
    },
    {
      name: 'video-error',
      label: { en: 'On Video Error' },
      event: {
        error: '',
      },
    },
    {
      name: 'play',
      label: { en: 'On Play' },
      event: {
        currentTime: 0,
      },
    },
    {
      name: 'pause',
      label: { en: 'On Pause' },
      event: {
        currentTime: 0,
      },
    },
  ],
};
