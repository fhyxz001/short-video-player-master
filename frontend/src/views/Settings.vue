<template>
  <div class="settings-page">
    <div class="header">
      <router-link to="/" class="back-btn">← 返回</router-link>
      <h1>设置</h1>
    </div>

    <div class="form-group">
      <label>本地视频路径:</label>
      <input v-model="config.localPath" type="text" placeholder="例如: D:/videos" />
      <p class="hint">请输入本地视频文件夹的绝对路径。</p>
    </div>

    <div class="actions">
      <button @click="saveSettings" :disabled="saving">
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const config = ref({
  localPath: ''
});

const saving = ref(false);
const message = ref('');
const API_BASE_URL = '';

const fetchSettings = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/settings`);
    config.value = response.data;
  } catch (error) {
    console.error('获取设置失败:', error);
  }
};

const saveSettings = async () => {
  saving.value = true;
  message.value = '';
  try {
    await axios.post(`${API_BASE_URL}/api/settings`, config.value);
    message.value = '设置保存成功!';
  } catch (error) {
    console.error('保存设置失败:', error);
    message.value = '保存设置失败。';
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<style scoped>
.settings-page {
  padding: 20px;
  color: white;
  background-color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-btn {
  color: #42b983;
  text-decoration: none;
  margin-right: 20px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #333;
  background-color: #333;
  color: white;
  box-sizing: border-box;
}

.hint {
  font-size: 12px;
  color: #888;
  margin-top: 5px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
}

button:disabled {
  background-color: #666;
}

.message {
  margin-top: 10px;
  text-align: center;
  color: #42b983;
}
</style>
