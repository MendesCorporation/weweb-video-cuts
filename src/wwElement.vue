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
        playsinline
        webkit-playsinline
        x-webkit-airplay="deny"
        @loadedmetadata="handleVideoLoaded"
        @error="handleVideoError"
        @play="handlePlay"
        @pause="handlePause"
        @timeupdate="handleTimeUpdate"
      >
        Your browser does not support the video tag.
      </video>

      <!-- Grid Watermark Overlay -->
      <div class="watermark-grid" :style="watermarkGridStyle">
        <svg class="watermark-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid-pattern"
              :width="gridSpacing"
              :height="gridSpacing"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <!-- Diagonal lines -->
              <line
                x1="0"
                y1="0"
                :x2="gridSpacing"
                :y2="0"
                :stroke="props.content?.watermarkColor || '#FFFFFF'"
                :stroke-width="gridLineWidth"
                :opacity="gridLineOpacity"
              />
              <line
                x1="0"
                y1="0"
                x2="0"
                :y2="gridSpacing"
                :stroke="props.content?.watermarkColor || '#FFFFFF'"
                :stroke-width="gridLineWidth"
                :opacity="gridLineOpacity"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        <!-- Text watermarks in grid pattern -->
        <div
          v-for="(position, index) in gridWatermarkPositions"
          :key="index"
          class="grid-watermark-text"
          :style="getGridWatermarkStyle(position)"
        >
          {{ props.content?.watermarkText || '#ProibidoReprodução' }}
        </div>
      </div>
    </div>

    <!-- Timeline Selector -->
    <div v-if="videoDuration > 0" class="timeline-container" :style="timelineContainerStyle">
      <div class="timeline-info" :style="timelineInfoStyle">
        <span class="duration-label" :style="{ color: props.content?.durationLabelColor || '#999' }">
          {{ formatTime(selectionStart) }} - {{ formatTime(selectionEnd) }} ({{ formatTime(selectionDuration) }} / {{ formatTime(effectiveMaxDuration) }})
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

      <!-- Manual Time Inputs -->
      <div class="time-inputs">
        <div class="time-input-group">
          <label class="time-input-label">Início</label>
          <input
            type="text"
            class="time-input"
            :value="formatTimeInput(selectionStart)"
            @input="handleStartInput"
            @blur="handleStartBlur"
            placeholder="0:00"
            inputmode="numeric"
          />
        </div>

        <div class="time-input-group">
          <label class="time-input-label">Fim</label>
          <input
            type="text"
            class="time-input"
            :value="formatTimeInput(selectionEnd)"
            @input="handleEndInput"
            @blur="handleEndBlur"
            placeholder="0:00"
            inputmode="numeric"
          />
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

    // Grid watermark configuration
    const gridSpacing = computed(() => props.content?.gridSpacing ?? 150);
    const gridLineWidth = computed(() => props.content?.gridLineWidth ?? 1);
    const gridLineOpacity = computed(() => props.content?.gridLineOpacity ?? 0.1);

    // Grid watermark text positions
    const gridWatermarkPositions = computed(() => {
      const spacing = Math.max(50, gridSpacing.value || 150); // Garante mínimo de 50px
      const positions = [];

      // Limita a quantidade de posições para evitar estouro de memória
      const maxCols = Math.min(15, Math.ceil(1920 / spacing));
      const maxRows = Math.min(15, Math.ceil(1080 / spacing));

      for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < maxCols; col++) {
          positions.push({
            x: col * spacing,
            y: row * spacing,
          });
        }
      }

      return positions;
    });

    // Styles
    const containerStyle = computed(() => ({
      width: '100%',
      height: '100%',
    }));

    const watermarkGridStyle = computed(() => ({
      '--watermark-opacity': props.content?.watermarkOpacity ?? 0.15,
      '--watermark-color': props.content?.watermarkColor || '#FFFFFF',
      '--watermark-font-size': props.content?.watermarkFontSize || '14px',
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

    const formatTimeInput = (seconds) => {
      if (!Number.isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const parseTimeInput = (timeString) => {
      // Remove espaços e aceita formatos: "1:30", "0:45", "15:20", etc
      const cleaned = timeString.trim().replace(/\s+/g, '');
      const parts = cleaned.split(':');

      if (parts.length !== 2) return null;

      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);

      if (!Number.isFinite(mins) || !Number.isFinite(secs) || mins < 0 || secs < 0 || secs >= 60) {
        return null;
      }

      return mins * 60 + secs;
    };

    const getGridWatermarkStyle = (position) => ({
      left: `${position.x}px`,
      top: `${position.y}px`,
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

    // Manual input handlers with mask
    const applyTimeMask = (value) => {
      // Remove tudo exceto números
      const numbers = value.replace(/\D/g, '');

      if (numbers.length === 0) return '';
      if (numbers.length === 1) return numbers;

      // Formata como M:SS ou MM:SS
      if (numbers.length === 2) {
        return `${numbers[0]}:${numbers[1]}`;
      }

      if (numbers.length === 3) {
        return `${numbers[0]}:${numbers.slice(1, 3)}`;
      }

      // Se tiver 4+ dígitos, formata como MM:SS
      return `${numbers.slice(0, -2)}:${numbers.slice(-2)}`;
    };

    const handleStartInput = (event) => {
      const input = event.target;
      const cursorPosition = input.selectionStart;
      const oldValue = input.value;
      const newValue = event.data ? input.value : input.value;

      // Aplica máscara
      const masked = applyTimeMask(newValue);
      input.value = masked;

      // Ajusta posição do cursor
      if (event.data && cursorPosition) {
        const colonsBefore = (oldValue.substring(0, cursorPosition).match(/:/g) || []).length;
        const colonsAfter = (masked.substring(0, cursorPosition).match(/:/g) || []).length;
        const newCursorPosition = cursorPosition + (colonsAfter - colonsBefore);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }

      // Atualizar seleção se valor válido
      const parsed = parseTimeInput(masked);
      if (parsed !== null) {
        const maxStart = Math.max(videoDuration.value - effectiveMinDuration.value, 0);
        const clampedStart = Math.max(0, Math.min(parsed, maxStart));

        let newDuration = selectionEnd.value - clampedStart;
        if (newDuration > effectiveMaxDuration.value) {
          newDuration = effectiveMaxDuration.value;
        }

        const maxDurationFromStart = Math.min(effectiveMaxDuration.value, videoDuration.value - clampedStart);
        newDuration = Math.max(effectiveMinDuration.value, Math.min(newDuration, maxDurationFromStart));

        updateSelection(clampedStart, newDuration, false);
        updateVideoPreview(clampedStart);
      }
    };

    const handleStartBlur = (event) => {
      // Ao sair do campo, força formatação correta
      const parsed = parseTimeInput(event.target.value);
      if (parsed !== null) {
        const maxStart = Math.max(videoDuration.value - effectiveMinDuration.value, 0);
        const clampedStart = Math.max(0, Math.min(parsed, maxStart));

        let newDuration = selectionEnd.value - clampedStart;
        if (newDuration > effectiveMaxDuration.value) {
          newDuration = effectiveMaxDuration.value;
        }

        const maxDurationFromStart = Math.min(effectiveMaxDuration.value, videoDuration.value - clampedStart);
        newDuration = Math.max(effectiveMinDuration.value, Math.min(newDuration, maxDurationFromStart));

        updateSelection(clampedStart, newDuration);
      } else {
        // Se inválido, restaura valor atual
        event.target.value = formatTimeInput(selectionStart.value);
      }
    };

    const handleEndInput = (event) => {
      const input = event.target;
      const cursorPosition = input.selectionStart;
      const oldValue = input.value;
      const newValue = event.data ? input.value : input.value;

      // Aplica máscara
      const masked = applyTimeMask(newValue);
      input.value = masked;

      // Ajusta posição do cursor
      if (event.data && cursorPosition) {
        const colonsBefore = (oldValue.substring(0, cursorPosition).match(/:/g) || []).length;
        const colonsAfter = (masked.substring(0, cursorPosition).match(/:/g) || []).length;
        const newCursorPosition = cursorPosition + (colonsAfter - colonsBefore);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }

      const parsed = parseTimeInput(masked);
      if (parsed !== null) {
        const clampedEnd = Math.max(
          selectionStart.value + effectiveMinDuration.value,
          Math.min(parsed, videoDuration.value)
        );

        let newDuration = clampedEnd - selectionStart.value;

        if (newDuration > effectiveMaxDuration.value) {
          newDuration = effectiveMaxDuration.value;
        }

        newDuration = Math.max(effectiveMinDuration.value, Math.min(newDuration, effectiveMaxDuration.value));

        updateSelection(selectionStart.value, newDuration, false);
        updateVideoPreview(selectionStart.value + newDuration);
      }
    };

    const handleEndBlur = (event) => {
      const parsed = parseTimeInput(event.target.value);
      if (parsed !== null) {
        const clampedEnd = Math.max(
          selectionStart.value + effectiveMinDuration.value,
          Math.min(parsed, videoDuration.value)
        );

        let newDuration = clampedEnd - selectionStart.value;

        if (newDuration > effectiveMaxDuration.value) {
          newDuration = effectiveMaxDuration.value;
        }

        newDuration = Math.max(effectiveMinDuration.value, Math.min(newDuration, effectiveMaxDuration.value));

        updateSelection(selectionStart.value, newDuration);
      } else {
        event.target.value = formatTimeInput(selectionEnd.value);
      }
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
      gridWatermarkPositions,
      gridSpacing,
      gridLineWidth,
      gridLineOpacity,
      effectiveMaxDuration,
      containerStyle,
      watermarkGridStyle,
      timelineContainerStyle,
      timelineInfoStyle,
      selectionStyle,
      startHandleStyle,
      endHandleStyle,
      formatTime,
      formatTimeInput,
      getGridWatermarkStyle,
      handleVideoLoaded,
      handleVideoError,
      handlePlay,
      handlePause,
      handleTimeUpdate,
      handleTimelineClick,
      handleStartDrag,
      handleEndDrag,
      handleSelectionDrag,
      handleStartInput,
      handleStartBlur,
      handleEndInput,
      handleEndBlur,
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

.watermark-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.watermark-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.grid-watermark-text {
  position: absolute;
  color: var(--watermark-color, #fff);
  opacity: var(--watermark-opacity, 0.15);
  font-size: var(--watermark-font-size, 14px);
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
  transform: rotate(-45deg);
  transform-origin: center;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

.timeline-container {
  padding: 16px;
  background: #1a1a1a;
}

.timeline-info {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
}

.duration-label {
  font-weight: 500;
  text-align: center;
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

.time-inputs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
  padding-top: 8px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-input-label {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}


.time-input {
  width: 100%;
  padding: 12px 16px;
  background: #2a2a2a;
  border: 2px solid #3a3a3a;
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  font-family: monospace;
  text-align: center;
  transition: all 0.2s;

  &::placeholder {
    color: #555;
  }

  &:focus {
    outline: none;
    border-color: #007aff;
    background: #333;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #4a4a4a;
  }
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
    font-size: 11px;
    padding: 6px 8px;
  }

  .timeline-handle {
    width: 24px;
    height: 48px;
  }

  .time-inputs {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .time-input-group {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .time-input-label {
    min-width: 50px;
  }

  .time-input {
    padding: 10px 12px;
    font-size: 16px;
  }
}
</style>
