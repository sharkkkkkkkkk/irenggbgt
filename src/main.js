import { createClient } from '@supabase/supabase-js'

// SETUP ENV
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const APP_PASS = import.meta.env.VITE_APP_PASSWORD

// LOGIN SYSTEM
window.login = () => {
  if(document.getElementById('passInput').value === APP_PASS) {
    document.getElementById('loginOverlay').style.display = 'none'
    document.getElementById('app').style.display = 'flex'
    loadData()
  } else {
    document.getElementById('errorMsg').style.display = 'block'
  }
}

// NAVIGASI
window.nav = (id) => {
  document.querySelectorAll('main section').forEach(s => s.style.display='none')
  document.getElementById(id).style.display='block'
  loadData() // Refresh data saat pindah tab
}

// CRUD & LOGIC
const form = document.getElementById('addForm')
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const nama = document.getElementById('nama').value
  const kategori = document.getElementById('kategori').value
  const status = document.getElementById('status').value
  const deadline = document.getElementById('deadline').value
  const catatan = document.getElementById('note').value

  await supabase.from('airdrop_projects').insert([{ nama_proyek:nama, kategori, status, deadline: deadline||null, catatan }])
  alert('Data Masuk!'); form.reset()
})

async function loadData() {
  // Load Daily
  const dailyDiv = document.getElementById('dailyList')
  const { data: dailyData } = await supabase.from('airdrop_projects').select('*').eq('kategori','Daily')
  dailyDiv.innerHTML = ''
  const today = new Date().toISOString().split('T')[0]
  
  dailyData?.forEach(item => {
    const isDone = item.last_check_in === today
    dailyDiv.innerHTML += `
      <div class="card" style="border:1px solid ${isDone?'#0f0':'#333'}">
        <h3>${item.nama_proyek}</h3>
        <button onclick="checkIn(${item.id})" style="background:${isDone?'green':'#333'}">
          ${isDone ? 'SELESAI' : 'GARAP'}
        </button>
      </div>`
  })

  // Load Rekapan
  const tbody = document.querySelector('#recapTable tbody')
  const { data: allData } = await supabase.from('airdrop_projects').select('*').order('created_at',{ascending:false})
  tbody.innerHTML = ''
  allData?.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.nama_proyek}</td>
        <td>${item.status}</td>
        <td><button onclick="del(${item.id})" style="background:red;padding:5px;">Hapus</button></td>
      </tr>`
  })
}

window.checkIn = async (id) => {
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('airdrop_projects').update({last_check_in:today}).eq('id',id)
  loadData()
}

window.del = async (id) => {
  if(confirm('Hapus?')) {
    await supabase.from('airdrop_projects').delete().eq('id',id)
    loadData()
  }
}