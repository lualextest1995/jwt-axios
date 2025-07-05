<script setup>
import http from '@/utils/request'
import { useRouter } from 'vue-router'
const router = useRouter()

async function login() {
  try {
    const data = { name: 'alice', password: 'password123' }
    await http.post('/api/login', data)
    router.push('/about')
  } catch (error) {
    console.warn('登入失敗:', error)
  }
}
</script>

<template>
  <main>
    <h1>Home</h1>
    <button @click="login">登入</button>
  </main>
</template>
