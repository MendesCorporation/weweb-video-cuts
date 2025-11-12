<template>
  <div class="video-cut-player" :style="containerStyle">
    <!-- Video Container with Watermarks -->
    <div class="video-wrapper">
      <video
        ref="videoRef"
        class="video-element"
        :src="props.content?.videoUrl"
        :controls="props.content?.showControls ?? true"
        :autoplay="props.content?.autoPlay ?? false"
        :preload="props.content?.preload || 'metadata'"
        controlslist="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        @loadedmetadata="handleVideoLoaded"
        @error="handleVideoError"
        @play="handlePlay"
        @pause="handlePause"
        @timeupdate="handleTimeUpdate"
      >
        Your browser does not support the video tag.
      </video>

      <!-- Multiple Watermarks Overlay -->
      <div class="watermarks-container" :style="watermarksStyle">
        <div
          v-for="(watermark, index) in watermarkPositions"
          :key="index"
          class="watermark"
          :style="getWatermarkStyle(watermark)"
        >
          {{ props.content?.watermarkText || 'FutLab' }}
        </div>
      </div>
    </div>

    <!-- Timeline Selector -->
    <div v-if="videoDuration > 0" class="timeline-container" :style="timelineContainerStyle">
      <div class="timeline-info" :style="timelineInfoStyle">
        <span class="time-label" :style="{ color: props.content?.timeLabelColor || '#007AFF' }">
          {{ formatTime(selectionStart) }}
        </span>
        <span class="duration-label" :style="{ color: props.content?.durationLabelColor || '#999' }">
          {{ formatTime(selectionStart) }} - {{ formatTime(selectionEnd) }} ({{ formatTime(selectionDuration) }} / {{ formatTime(effectiveMaxDuration) }})
        </span>
        <span class="time-label" :style="{ color: props.content?.timeLabelColor || '#007AFF' }">
          {{ formatTime(selectionEnd) }}
        </span>
      </div>

      <div
        ref="timelineRef"
        class="timeline-track"
        @pointerdown="handleTimelineClick"
      >
        <!-- Selected Range -->
        <div
          class="timeline-selection"
          :style="selectionStyle"
          @pointerdown.stop="handleSelectionDrag"
        />

        <!-- Start Handle -->
        <div
          class="timeline-handle start"
          :style="startHandleStyle"
          @pointerdown.stop="handleStartDrag"
        >
          <div class="handle-grip" />
        </div>

        <!-- End Handle -->
        <div
          class="timeline-handle end"
          :style="endHandleStyle"
          @pointerdown.stop="handleEndDrag"
        >
          <div class="handle-grip" />
        </div>
      </div>
    </div>

    <!-- Loading/Error States -->
    <div v-if="!props.content?.videoUrl" class="message-overlay">
      <p>Please provide a video URL in the component settings</p>
    </div>
    <div v-else-if="errorMessage" class="message-overlay error">
      <p>{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    // Refs
    const videoRef = ref(null);
    const timelineRef = ref(null);

    // State
    const videoDuration = ref(0);
    const selectionStart = ref(0);
    const selectionDuration = ref(10);
    const errorMessage = ref('');
    const dragState = ref(null);
    const currentTime = ref(0);
    const isPlaying = ref(false);

    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing ?? false);
    /* wwEditor:end */

    // Internal Variables for NoCode users
    const { value: cutStartTime, setValue: setCutStartTime } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'cutStartTime',
      type: 'number',
      defaultValue: 0,
    });

    const { value: cutEndTime, setValue: setCutEndTime } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'cutEndTime',
      type: 'number',
      defaultValue: 0,
    });

    const { value: cutDuration, setValue: setCutDuration } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'cutDuration',
      type: 'number',
      defaultValue: 0,
    });

    const { value: videoReady, setValue: setVideoReady } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'videoReady',
      type: 'boolean',
      defaultValue: false,
    });

    // Computed Properties
    const effectiveMaxDuration = computed(() => {
      const max = props.content?.maxCutDuration ?? 10;
      if (videoDuration.value > 0) {
        return Math.min(max, videoDuration.value);
      }
      return max;
    });

    const effectiveMinDuration = computed(() => {
      const min = props.content?.minCutDuration ?? 0.5;
      if (videoDuration.value > 0) {
        return Math.min(min, videoDuration.value);
      }
      return min;
    });

    const selectionEnd = computed(() => {
      return Math.min(selectionStart.value + selectionDuration.value, videoDuration.value);
    });

    const selectionLeftPercent = computed(() => {
      if (videoDuration.value === 0) return 0;
      return (selectionStart.value / videoDuration.value) * 100;
    });

    const selectionWidthPercent = computed(() => {
      if (videoDuration.value === 0) return 0;
      return ((selectionEnd.value - selectionStart.value) / videoDuration.value) * 100;
    });

    // Dynamic handle size based on video duration
    const handleSize = computed(() => {
      const duration = videoDuration.value;
      if (duration === 0) return { width: '20px', height: '40px' };

      // For videos longer than 5 minutes, use smaller handles
      if (duration > 300) {
        return { width: '12px', height: '32px' };
      }
      // For videos longer than 2 minutes
      if (duration > 120) {
        return { width: '16px', height: '36px' };
      }
      // Default for shorter videos
      return { width: '20px', height: '40px' };
    });

    // Watermark positions (randomly distributed)
    const watermarkPositions = computed(() => {
      const count = props.content?.watermarkCount ?? 12;
      const positions = [];
      for (let i = 0; i < count; i++) {
        positions.push({
          top: `${(i * 37 + 10) % 90}%`,
          left: `${(i * 43 + 5) % 90}%`,
          rotation: (i * 23) % 360,
        });
      }
      return positions;
    });

    // Styles
    const containerStyle = computed(() => ({
      width: '100%',
      height: '100%',
    }));

    const watermarksStyle = computed(() => ({
      '--watermark-opacity': props.content?.watermarkOpacity ?? 0.15,
      '--watermark-color': props.content?.watermarkColor || '#FFFFFF',
      '--watermark-font-size': props.content?.watermarkFontSize || '24px',
    }));

    const timelineContainerStyle = computed(() => ({
      '--timeline-height': props.content?.timelineHeight || '60px',
    }));

    const selectionStyle = computed(() => ({
      left: `${selectionLeftPercent.value}%`,
      width: `${selectionWidthPercent.value}%`,
      backgroundColor: props.content?.timelineColor || '#007AFF',
    }));

    const startHandleStyle = computed(() => ({
      left: `${selectionLeftPercent.value}%`,
      backgroundColor: props.content?.handleColor || '#FFFFFF',
      borderColor: props.content?.handleBorderColor || '#007AFF',
      width: handleSize.value.width,
      height: handleSize.value.height,
      '--grip-color': props.content?.handleGripColor || '#007AFF',
    }));

    const endHandleStyle = computed(() => ({
      left: `${selectionLeftPercent.value + selectionWidthPercent.value}%`,
      backgroundColor: props.content?.handleColor || '#FFFFFF',
      borderColor: props.content?.handleBorderColor || '#007AFF',
      width: handleSize.value.width,
      height: handleSize.value.height,
      '--grip-color': props.content?.handleGripColor || '#007AFF',
    }));

    const timelineInfoStyle = computed(() => ({
      backgroundColor: 'rgba(26, 26, 26, 0.8)',
    }));

    // Helper Functions
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    };

    const getWatermarkStyle = (position) => ({
      top: position.top,
      left: position.left,
      transform: `rotate(${position.rotation}deg)`,
    });

    const clampSelection = (start, duration) => {
      const clampedStart = Math.max(0, Math.min(start, videoDuration.value - effectiveMinDuration.value));
      const maxDuration = Math.min(effectiveMaxDuration.value, videoDuration.value - clampedStart);
      const clampedDuration = Math.max(effectiveMinDuration.value, Math.min(duration, maxDuration));
      return { start: clampedStart, duration: clampedDuration };
    };

    const updateSelection = (start, duration, emitEvent = true) => {
      const clamped = clampSelection(start, duration);
      selectionStart.value = clamped.start;
      selectionDuration.value = clamped.duration;

      // Update internal variables
      setCutStartTime(clamped.start);
      setCutEndTime(clamped.start + clamped.duration);
      setCutDuration(clamped.duration);

      // Emit trigger event
      if (emitEvent) {
        emit('trigger-event', {
          name: 'selection-change',
          event: {
            startTime: clamped.start,
            endTime: clamped.start + clamped.duration,
            duration: clamped.duration,
          },
        });
      }
    };

    const syncPreviewTo = (time) => {
      const video = videoRef.value;
      if (!video) return;
      const clamped = Math.max(0, Math.min(time, videoDuration.value));
      try {
        video.currentTime = clamped;
      } catch {
        // Ignore errors
      }
    };

    const updateVideoPreview = (time) => {
      const video = videoRef.value;
      if (!video) return;

      const clamped = Math.max(0, Math.min(time, videoDuration.value));
      try {
        video.currentTime = clamped;
      } catch {
        // Ignore errors
      }
    };

    // Event Handlers
    const handleVideoLoaded = (event) => {
      const video = event.target;
      videoDuration.value = video.duration || 0;
      setVideoReady(true);
      errorMessage.value = '';

      // Initialize selection
      const initialStart = props.content?.initialStartTime ?? 0;
      const initialDuration = Math.min(
        props.content?.maxCutDuration ?? 10,
        videoDuration.value
      );
      updateSelection(initialStart, initialDuration, false);

      emit('trigger-event', {
        name: 'video-loaded',
        event: {
          duration: videoDuration.value,
          videoUrl: props.content?.videoUrl || '',
        },
      });
    };

    const handleVideoError = () => {
      errorMessage.value = 'Failed to load video. Please check the URL.';
      setVideoReady(false);
      emit('trigger-event', {
        name: 'video-error',
        event: {
          error: 'Failed to load video',
        },
      });
    };

    const handlePlay = () => {
      isPlaying.value = true;
      emit('trigger-event', {
        name: 'play',
        event: {
          currentTime: videoRef.value?.currentTime || 0,
        },
      });
    };

    const handlePause = () => {
      isPlaying.value = false;
      emit('trigger-event', {
        name: 'pause',
        event: {
          currentTime: videoRef.value?.currentTime || 0,
        },
      });
    };

    const handleTimeUpdate = () => {
      if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
      }
    };

    const handleTimelineClick = (event) => {
      if (dragState.value || videoDuration.value === 0) return;
      const target = event.target;
      if (target.classList.contains('timeline-handle') || target.closest('.timeline-handle')) return;
      if (target.classList.contains('timeline-selection')) return;

      const rect = timelineRef.value?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;

      const ratio = (event.clientX - rect.left) / rect.width;
      const clickTime = ratio * videoDuration.value;

      // Center selection around click
      const newStart = Math.max(0, clickTime - selectionDuration.value / 2);
      updateSelection(newStart, selectionDuration.value);
      syncPreviewTo(newStart);
    };

    const handleStartDrag = (event) => {
      if (videoDuration.value === 0) return;
      event.preventDefault();
      dragState.value = {
        type: 'start',
        pointerId: event.pointerId,
        initialStart: selectionStart.value,
        initialDuration: selectionDuration.value,
        initialClientX: event.clientX,
      };
      event.target.setPointerCapture(event.pointerId);
    };

    const handleEndDrag = (event) => {
      if (videoDuration.value === 0) return;
      event.preventDefault();
      dragState.value = {
        type: 'end',
        pointerId: event.pointerId,
        initialStart: selectionStart.value,
        initialDuration: selectionDuration.value,
        initialClientX: event.clientX,
      };
      event.target.setPointerCapture(event.pointerId);
    };

    const handleSelectionDrag = (event) => {
      if (videoDuration.value === 0) return;
      event.preventDefault();
      dragState.value = {
        type: 'selection',
        pointerId: event.pointerId,
        initialStart: selectionStart.value,
        initialDuration: selectionDuration.value,
        initialClientX: event.clientX,
      };
      event.target.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!dragState.value || event.pointerId !== dragState.value.pointerId) return;

      const rect = timelineRef.value?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;

      const deltaX = event.clientX - dragState.value.initialClientX;
      const deltaTime = (deltaX / rect.width) * videoDuration.value;

      if (dragState.value.type === 'selection') {
        // Move entire selection
        const newStart = dragState.value.initialStart + deltaTime;
        updateSelection(newStart, dragState.value.initialDuration, false);
        // Update video preview to follow selection start
        updateVideoPreview(Math.max(0, Math.min(newStart, videoDuration.value)));
      } else if (dragState.value.type === 'start') {
        // Adjust start time
        const newStart = dragState.value.initialStart + deltaTime;
        const newDuration = dragState.value.initialDuration - deltaTime;
        updateSelection(newStart, newDuration, false);
        // Update video preview to follow start handle
        updateVideoPreview(Math.max(0, Math.min(newStart, videoDuration.value)));
      } else if (dragState.value.type === 'end') {
        // Adjust end time
        const newDuration = dragState.value.initialDuration + deltaTime;
        updateSelection(dragState.value.initialStart, newDuration, false);
        // Update video preview to follow end handle
        const endTime = dragState.value.initialStart + newDuration;
        updateVideoPreview(Math.max(0, Math.min(endTime, videoDuration.value)));
      }
    };

    const handlePointerUp = (event) => {
      if (!dragState.value || event.pointerId !== dragState.value.pointerId) return;

      // Emit final selection change event
      emit('trigger-event', {
        name: 'selection-change',
        event: {
          startTime: selectionStart.value,
          endTime: selectionStart.value + selectionDuration.value,
          duration: selectionDuration.value,
        },
      });

      dragState.value = null;
    };

    // Watchers
    watch(() => props.content?.videoUrl, () => {
      videoDuration.value = 0;
      selectionStart.value = 0;
      selectionDuration.value = props.content?.maxCutDuration ?? 10;
      errorMessage.value = '';
      setVideoReady(false);
    });

    watch(() => props.content?.initialStartTime, (newValue) => {
      if (typeof newValue === 'number' && videoDuration.value > 0) {
        updateSelection(newValue, selectionDuration.value, false);
      }
    });

    watch(() => props.content?.maxCutDuration, (newMax) => {
      if (typeof newMax === 'number' && videoDuration.value > 0) {
        if (selectionDuration.value > newMax) {
          updateSelection(selectionStart.value, newMax);
        }
      }
    });

    // Lifecycle
    onMounted(() => {
      wwLib.getFrontWindow().addEventListener('pointermove', handlePointerMove);
      wwLib.getFrontWindow().addEventListener('pointerup', handlePointerUp);
      wwLib.getFrontWindow().addEventListener('pointercancel', handlePointerUp);
    });

    onBeforeUnmount(() => {
      wwLib.getFrontWindow().removeEventListener('pointermove', handlePointerMove);
      wwLib.getFrontWindow().removeEventListener('pointerup', handlePointerUp);
      wwLib.getFrontWindow().removeEventListener('pointercancel', handlePointerUp);
    });

    return {
      props,
      videoRef,
      timelineRef,
      videoDuration,
      selectionStart,
      selectionDuration,
      selectionEnd,
      errorMessage,
      watermarkPositions,
      effectiveMaxDuration,
      containerStyle,
      watermarksStyle,
      timelineContainerStyle,
      timelineInfoStyle,
      selectionStyle,
      startHandleStyle,
      endHandleStyle,
      formatTime,
      getWatermarkStyle,
      handleVideoLoaded,
      handleVideoError,
      handlePlay,
      handlePause,
      handleTimeUpdate,
      handleTimelineClick,
      handleStartDrag,
      handleEndDrag,
      handleSelectionDrag,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    };
  },
};
</script>

<style lang="scss" scoped>
.video-cut-player {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.video-wrapper {
  position: relative;
  width: 100%;
  background: #000;
}

.video-element {
  width: 100%;
  height: auto;
  display: block;
  max-height: 70vh;
  object-fit: contain;

  &::-webkit-media-controls-fullscreen-button {
    display: none;
  }

  &::-webkit-media-controls-picture-in-picture-button {
    display: none;
  }
}

.watermarks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.watermark {
  position: absolute;
  color: var(--watermark-color, #fff);
  opacity: var(--watermark-opacity, 0.15);
  font-size: var(--watermark-font-size, 24px);
  font-weight: bold;
  white-space: nowrap;
  user-select: none;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.timeline-container {
  padding: 16px;
  background: #1a1a1a;
}

.timeline-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;
}

.time-label {
  font-weight: bold;
}

.duration-label {
  font-weight: 500;
}

.timeline-track {
  position: relative;
  height: var(--timeline-height, 60px);
  background: #333;
  border-radius: 8px;
  cursor: pointer;
  touch-action: none;
}

.timeline-selection {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: #007aff;
  opacity: 0.4;
  border-radius: 4px;
  cursor: move;
  transition: opacity 0.2s;
}

.timeline-selection:hover {
  opacity: 0.6;
}

.timeline-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%) translateX(-50%);
  border: 2px solid;
  border-radius: 6px;
  cursor: ew-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  will-change: transform;
}

.timeline-handle:hover {
  transform: translateY(-50%) translateX(-50%) scale(1.15);
  box-shadow: 0 3px 12px rgba(0, 122, 255, 0.4);
}

.timeline-handle.end {
  transform: translateY(-50%) translateX(-50%);
}

.timeline-handle.end:hover {
  transform: translateY(-50%) translateX(-50%) scale(1.15);
  box-shadow: 0 3px 12px rgba(0, 122, 255, 0.4);
}

.handle-grip {
  width: 2px;
  height: 60%;
  background: var(--grip-color, #007aff);
  border-radius: 2px;
}

.message-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  text-align: center;
  z-index: 100;
  pointer-events: none;

  p {
    margin: 0;
    font-size: 16px;
  }

  &.error {
    background: rgba(220, 38, 38, 0.9);
  }
}

@media (max-width: 768px) {
  .timeline-info {
    font-size: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .timeline-handle {
    width: 24px;
    height: 48px;
  }
}
</style>
