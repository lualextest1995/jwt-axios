<template>
  <div class="about">
    <h1>This is an about page</h1>
    <button @click="logout">登出</button>
    <button @click="batchRequests">批量打</button>
    <button @click="fetchProfile">打 profile</button>
    <button @click="fetchData">打 data</button>
    <button @click="fetchAdmin">打 admin</button>
    <p>Profile:</p>
    <pre>{{ data.profile }}</pre>
    <p>Data:</p>
    <pre>{{ data.data }}</pre>
    <p>Admin:</p>
    <pre>{{ data.admin }}</pre>
  </div>
</template>

<script setup>
import http from '@/utils/request'
import Cookies from '@/utils/cookie'
import { useRouter } from 'vue-router'
import { reactive } from 'vue'
const router = useRouter()
const data = reactive({
  profile: null,
  data: null,
  admin: null,
})

async function logout() {
  try {
    await http.post('/api/logout')
  } catch (error) {
    console.warn('登出失敗:', error)
  } finally {
    Cookies.clear()
    router.push('/')
  }
}

async function batchRequests() {
  data.profile = null
  data.data = null
  data.admin = null
  const requests = [http.get('/api/profile'), http.get('/api/data'), http.get('/api/admin')]
  try {
    const res = await Promise.all(requests)
    data.profile = res[0].data
    data.data = res[1].data
    data.admin = res[2].data
  } catch (error) {
    console.error('批量請求失敗:', error)
  }
}

async function fetchProfile() {
  data.profile = null
  try {
    const response = await http.get('/api/profile')
    data.profile = response.data
  } catch (error) {
    console.error('Error fetching profile:', error)
  }
}

async function fetchData() {
  data.data = null
  try {
    const response = await http.get('/api/data')
    data.data = response.data
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

async function fetchAdmin() {
  data.admin = null
  try {
    const response = await http.get('/api/admin')
    data.admin = response.data
  } catch (error) {
    console.error('Error fetching admin:', error)
  }
}
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
