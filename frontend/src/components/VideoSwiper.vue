<template>
  <div class="video-swiper-container">
    <div class="delete-btn" @click.stop="confirmDelete">
      🗑️
    </div>
    <swiper
      :direction="'vertical'"
      :modules="modules"
      :virtual="{
        addSlidesBefore: 1,
        addSlidesAfter: 3
      }"
      class="mySwiper"
      @swiper="onSwiper"
      @slideChange="onSlideChange"
      @reachEnd="onReachEnd"
    >
      <swiper-slide v-for="(video, index) in videos" :key="video.name" :virtualIndex="index">
        <div class="video-wrapper">
          <video
            :ref="el => setVideoRef(el, index)"
            :src="getVideoUrl(video.url)"
            :preload="getPreload(index)"
            playsinline
            loop
            @timeupdate="onTimeUpdate(index)"
            @loadedmetadata="onLoadedMetadata(index)"
            @progress="onProgress(index)"
          ></video>
          
          <!-- Touch Area for Play/Pause -->
          <div 
            class="touch-area touch-full"
            @click.stop="togglePlay(index)"
          ></div>
          
          <!-- Status Icons -->
          <transition name="fade">
            <div v-if="showPlayIcon[index]" class="status-icon play-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </transition>
          
          <!-- Video Info (Bottom Left) -->
          <div class="video-info">
            <h3 class="video-name">{{ video.name }}</h3>
          </div>

          <!-- Progress Bar -->
          <div 
            class="progress-container" 
            :class="{ dragging: isDragging && dragIndex === index }" 
            @click.stop
          >
            <div class="time-display">
              <span class="current-time">{{ formatTime(videoProgress[index]?.currentTime || 0) }}</span>
              <span class="separator">/</span>
              <span class="total-time">{{ formatTime(videoProgress[index]?.duration || 0) }}</span>
            </div>
            <div 
              class="progress-bar-wrapper"
              @mousedown="startDrag($event, index)"
              @touchstart="startDrag($event, index)"
              @click.stop="seekTo($event, index)"
            >
              <div class="progress-bar-bg"></div>
              <div 
                class="progress-bar-buffered" 
                :style="{ width: (videoProgress[index]?.buffered || 0) + '%' }"
              ></div>
              <div 
                class="progress-bar-played" 
                :style="{ width: (videoProgress[index]?.progress || 0) + '%' }"
              >
                <div class="progress-handle"></div>
              </div>
            </div>
          </div>
        </div>
      </swiper-slide>
    </swiper>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Mousewheel, Virtual } from 'swiper/modules';
import axios from 'axios';

const props = defineProps({
  videos: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['loadMore', 'videoDeleted']);

const modules = [Mousewheel, Virtual];
const videoRefs = ref({});
const activeIndex = ref(0);
const videoProgress = ref({});
const isDragging = ref(false);
const dragIndex = ref(null);

const showPlayIcon = ref({});



// Use object or map for refs in virtual slides as indices might not be continuous in DOM
const setVideoRef = (el, index) => {
  if (el) {
    videoRefs.value[index] = el;
  }
};

let swiperInstance = null;
const onSwiper = (swiper) => {
  swiperInstance = swiper;
};

const API_BASE_URL = '';

const getVideoUrl = (url) => {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
};

const getPreload = (index) => {
  // Preload current, previous 1, and next 2
  const current = activeIndex.value;
  if (index >= current - 1 && index <= current + 2) {
    return 'auto';
  }
  return 'none';
};

const onReachEnd = () => {
  emit('loadMore');
};

const onSlideChange = (swiper) => {
  const prevIndex = activeIndex.value;
  activeIndex.value = swiper.activeIndex;

  // Pause previous video
  if (videoRefs.value[prevIndex]) {
    videoRefs.value[prevIndex].pause();
    videoRefs.value[prevIndex].currentTime = 0;
    showPlayIcon.value[prevIndex] = false; // Hide play icon when switching away
  }

  // Check if we need to load more (preload when within 3 slides of the end)
  if (props.videos.length - activeIndex.value <= 3) {
    emit('loadMore');
  }

  // Play new video
  // We need to wait for DOM update if virtual slide just rendered
  nextTick(() => {
     playVideo(activeIndex.value);
  });
};

const playVideo = (index) => {
  const video = videoRefs.value[index];
  if (video) {
    video.play().then(() => {
      // Successfully playing, hide play icon
      showPlayIcon.value[index] = false;
    }).catch(e => {
      // Autoplay prevented, show play icon
      showPlayIcon.value[index] = true;
      // console.log('Autoplay prevented:', e)
    });
    // video.muted = false; // Careful with this, might need user interaction first
  }
};

const togglePlay = (index) => {
  const video = videoRefs.value[index];
  if (video) {
    if (video.paused) {
      video.play();
      showPlayIcon.value[index] = false; // Hide icon when playing
    } else {
      video.pause();
      showPlayIcon.value[index] = true; // Show icon when paused, keep it visible
    }
  }
};

// Format time in MM:SS format
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Update progress as video plays
const onTimeUpdate = (index) => {
  if (isDragging.value && dragIndex.value === index) return;
  
  const video = videoRefs.value[index];
  if (!video) return;
  
  if (!videoProgress.value[index]) {
    videoProgress.value[index] = {};
  }
  
  videoProgress.value[index].currentTime = video.currentTime;
  videoProgress.value[index].progress = (video.currentTime / video.duration) * 100;
};

// Store duration when metadata loads
const onLoadedMetadata = (index) => {
  const video = videoRefs.value[index];
  if (!video) return;
  
  if (!videoProgress.value[index]) {
    videoProgress.value[index] = {};
  }
  
  videoProgress.value[index].duration = video.duration;
};

// Update buffered progress
const onProgress = (index) => {
  const video = videoRefs.value[index];
  if (!video || !video.buffered.length) return;
  
  if (!videoProgress.value[index]) {
    videoProgress.value[index] = {};
  }
  
  const bufferedEnd = video.buffered.end(video.buffered.length - 1);
  videoProgress.value[index].buffered = (bufferedEnd / video.duration) * 100;
};

// Seek to position when clicking on progress bar
const seekTo = (event, index) => {
  const video = videoRefs.value[index];
  if (!video) return;
  
  const progressBar = event.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  
  video.currentTime = percentage * video.duration;
};

// Start dragging the progress handle
const startDrag = (event, index) => {
  event.preventDefault();
  isDragging.value = true;
  dragIndex.value = index;
  
  // Add global listeners
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag);
  document.addEventListener('touchend', stopDrag);
  
  // Initial seek
  onDrag(event);
};

// Handle dragging
const onDrag = (event) => {
  if (!isDragging.value || dragIndex.value === null) return;
  
  const index = dragIndex.value;
  const video = videoRefs.value[index];
  if (!video) return;
  
  // Find the progress bar wrapper
  const progressBar = document.querySelector('.swiper-slide-active .progress-bar-wrapper');
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const clientX = event.clientX || (event.touches && event.touches[0]?.clientX);
  
  if (!clientX) return;
  
  let clickX = clientX - rect.left;
  clickX = Math.max(0, Math.min(clickX, rect.width));
  
  const percentage = clickX / rect.width;
  const newTime = percentage * video.duration;
  
  video.currentTime = newTime;
  
  // Update progress immediately
  if (!videoProgress.value[index]) {
    videoProgress.value[index] = {};
  }
  videoProgress.value[index].currentTime = newTime;
  videoProgress.value[index].progress = percentage * 100;
};

// Stop dragging
const stopDrag = () => {
  isDragging.value = false;
  dragIndex.value = null;
  
  // Remove global listeners
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);
};

const confirmDelete = async () => {
  const currentVideo = props.videos[activeIndex.value];
  if (!currentVideo) return;

  if (confirm(`确认删除视频 "${currentVideo.name}" 吗？此操作不可恢复。`)) {
    try {
      await axios.delete(`${API_BASE_URL}/api/videos/${encodeURIComponent(currentVideo.name)}`);
      emit('videoDeleted', activeIndex.value);
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('删除失败，请查看控制台日志。');
    }
  }
};

// Watch for videos change (e.g. load more)
watch(() => props.videos, async (newVal, oldVal) => {
  if (swiperInstance) {
    nextTick(() => {
      swiperInstance.update();
    });
  }

  // If it's the initial load
  if (oldVal.length === 0 && newVal.length > 0) {
    await nextTick();
    playVideo(0);
  }
}, { deep: false });

// Expose activeIndex to parent component for delete functionality
defineExpose({
  activeIndex,
  getCurrentVideo: () => props.videos[activeIndex.value]
});

</script>

<style scoped>
.video-swiper-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  font-size: 24px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  user-select: none;
}

.mySwiper {
  width: 100%;
  height: 100%;
}

.video-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
}

video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Video Info Styles */
.video-info {
  position: absolute;
  bottom: 40px; /* Position above progress bar */
  left: 20px;
  right: 20px;
  z-index: 40;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.video-name {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress Bar Styles */
.progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 20px 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%);
  z-index: 50;
  user-select: none;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.progress-container:hover,
.progress-container.dragging {
  opacity: 1;
}

.time-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.current-time {
  color: #fff;
  font-weight: 600;
}

.separator {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.total-time {
  color: rgba(255, 255, 255, 0.8);
}

.progress-bar-wrapper {
  position: relative;
  height: 4px;
  cursor: pointer;
  border-radius: 2px;
  overflow: visible;
  transition: height 0.2s ease;
}

.progress-bar-wrapper:hover {
  height: 6px;
}

.progress-bar-wrapper:hover .progress-handle,
.progress-container.dragging .progress-handle {
  transform: translateY(-50%) scale(1.4);
  opacity: 1;
}

.progress-bar-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  backdrop-filter: blur(10px);
}

.progress-bar-buffered {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-bar-played {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

.progress-handle {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(102, 126, 234, 0.3);
  transition: transform 0.2s ease, opacity 0.2s ease;
  opacity: 0;
}

.progress-bar-wrapper:active .progress-handle {
  transform: translateY(-50%) scale(1.6);
}

/* Responsive adjustments for touch devices */
@media (hover: none) and (pointer: coarse) {
  .progress-bar-wrapper {
    height: 6px;
    padding: 10px 0;
    margin: -10px 0;
  }
  
  .progress-handle {
    opacity: 1;
    transform: translateY(-50%) scale(1.2);
  }
  
  .time-display {
    font-size: 14px;
  }
}

/* Touch Areas */
.touch-area {
  position: absolute;
  top: 0;
  bottom: 80px; /* Leave space for progress bar */
  width: 100%;
  left: 0;
  z-index: 10;
  cursor: pointer;
}

/* Status Icons */
.status-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 40;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.status-icon svg {
  width: 80px;
  height: 80px;
  color: white;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  padding: 16px;
  backdrop-filter: blur(10px);
}

.speed-text {
  font-size: 18px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-enter-to, .fade-leave-from {
  opacity: 1;
}

/* Play icon specific styling */
.play-icon svg {
  background: rgba(0, 0, 0, 0.6);
}

/* Forward/Rewind icon animations */
.forward-icon svg,
.rewind-icon svg {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

</style>