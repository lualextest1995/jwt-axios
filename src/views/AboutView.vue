<template>
  <div class="about">
    <h1>This is an about page</h1>
    <button @click="login">登入</button>
    <button @click="logout">登出</button>
    <button @click="batchRequests">批量打</button>
    <button @click="fetchProfile">打 profile</button>
    <button @click="fetchData">打 data</button>
    <button @click="fetchAdmin">打 admin</button>
  </div>
</template>

<script setup>
import http from '@/utils/request'
import Cookies from '@/utils/cookie'

async function login() {
  await http.post('/api/login', {
    name: 'alice',
    password: 'password123',
  })
}

async function logout() {
  await http.post('/api/logout')
  Cookies.clear()
}

async function batchRequests() {
  const requests = [
    http.get('/api/profile'),
    http.get('/api/data'),
    http.get('/api/admin'),
  ]
  await Promise.all(requests)
}

async function fetchProfile() {
  try {
    const response = await http.get('/api/profile')
    console.log('Profile:', response.data)
  } catch (error) {
    console.error('Error fetching profile:', error)
  }
}

async function fetchData() {
  try {
    const response = await http.get('/api/data')
    console.log('Data:', response.data)
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

async function fetchAdmin() {
  try {
    const response = await http.get('/api/admin')
    console.log('Admin:', response.data)
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
