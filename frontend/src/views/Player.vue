<template>
  <div class="player-page">
    <div v-if="loading" class="loading">视频加载中...</div>
    <div v-else-if="videos.length === 0" class="no-videos">
      未找到视频。 <router-link to="/settings">前往设置</router-link>
    </div>
    <VideoSwiper 
      v-else 
      :videos="videos" 
      @loadMore="loadMoreVideos" 
      @videoDeleted="onVideoDeleted"
    />
    
    <div class="controls">
      <router-link to="/settings" class="settings-btn">⚙️</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import VideoSwiper from '../components/VideoSwiper.vue';

const videos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const hasMore = ref(true);
const seed = ref(Date.now()); // Initialize with current timestamp for random session
const PAGE_SIZE = 10;
const API_BASE_URL = '';

const fetchVideos = async (isLoadMore = false) => {
  if (isLoadMore && (!hasMore.value || loadingMore.value)) return;
  
  if (isLoadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/videos`, {
      params: {
        page: page.value,
        limit: PAGE_SIZE,
        seed: seed.value
      }
    });
    
    const { videos: newVideos, hasMore: more } = response.data;
    
    if (isLoadMore) {
      videos.value = [...videos.value, ...newVideos];
    } else {
      videos.value = newVideos;
    }
    
    hasMore.value = more;
    if (more) {
      page.value++;
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMoreVideos = () => {
  fetchVideos(true);
};

const onVideoDeleted = (index) => {
  // Remove the deleted video from the list
  videos.value.splice(index, 1);
  // Swiper will automatically update via the watcher in VideoSwiper.vue
  
  // If we're running low on videos after deletion, load more
  if (videos.value.length < 5 && hasMore.value) {
    loadMoreVideos();
  }
};

onMounted(() => {
  fetchVideos();
});
</script>

<style scoped>
.player-page {
  position: relative;
  height: 100%;
  width: 100%;
}

.loading, .no-videos {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-direction: column;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.settings-btn {
  font-size: 24px;
  text-decoration: none;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
