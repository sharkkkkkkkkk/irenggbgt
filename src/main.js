import { createClient } from '@supabase/supabase-js'

// 1. SETUP ENV & CLIENT
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const APP_PASS = import.meta.env.VITE_APP_PASSWORD

// 2. LOGIN SYSTEM
window.login = () => {
  const input = document.getElementById('passInput').value
  if(input === APP_PASS) {
    document.getElementById('loginOverlay').classList.remove('active')
    document.getElementById('app').style.display = 'flex'
    loadData()
  } else {
    document.getElementById('errorMsg').style.display = 'block'
  }
}

// 3. NAVIGATION
window.nav = (id) => {
  document.querySelectorAll('main section').forEach(s => s.style.display='none')
  document.getElementById(id).style.display='block'
  
  // Active Sidebar State
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'))
  event.currentTarget.classList.add('active')
  
  loadData()
}

// 4. CREATE DATA (Input Baru)
const form = document.getElementById('addForm')
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  showToast('Menyimpan data...', 'info')

  const nama = document.getElementById('nama').value
  const kategori = document.getElementById('kategori').value
  const status = document.getElementById('status').value
  const deadline = document.getElementById('deadline').value
  const catatan = document.getElementById('note').value

  const { error } = await supabase.from('airdrop_projects').insert([{ 
    nama_proyek: nama, kategori, status, deadline: deadline||null, catatan 
  }])

  if(!error) {
    showToast('Data Berhasil Disimpan!', 'success')
    form.reset()
  } else {
    showToast('Gagal: ' + error.message, 'error')
  }
})

// 5. READ DATA (Load Semua Data)
async function loadData() {
  // A. Load Daily
  const dailyDiv = document.getElementById('dailyList')
  const { data: dailyData } = await supabase.from('airdrop_projects').select('*').eq('kategori','Daily').order('nama_proyek')
  
  dailyDiv.innerHTML = ''
  const today = new Date().toISOString().split('T')[0]

  dailyData?.forEach(item => {
    const isDone = item.last_check_in === today
    const cardClass = isDone ? 'daily-card done' : 'daily-card'
    const btnText = isDone ? '<i class="fas fa-check-circle"></i> Selesai' : 'Garap Sekarang'
    const btnStyle = isDone ? 'background:transparent; color:#00d26a; border:1px solid #00d26a;' : 'background:var(--primary); color:white; border:none;'

    dailyDiv.innerHTML += `
      <div class="${cardClass}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
           <h3 style="color:white; font-size:1.1rem;">${item.nama_proyek}</h3>
           <button onclick="deleteItem(${item.id})" style="background:none; border:none; color:#555; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>
        <p style="color:#ccc; font-size:0.85rem; margin-bottom:15px;">${item.catatan || 'Tidak ada catatan.'}</p>
        <button onclick="checkIn(${item.id})" style="width:100%; padding:10px; border-radius:6px; cursor:pointer; ${btnStyle}">
          ${btnText}
        </button>
      </div>`
  })

  // B. Load Table Rekapan
  const tbody = document.querySelector('#recapTable tbody')
  const { data: allData } = await supabase.from('airdrop_projects').select('*').order('created_at',{ascending:false})
  
  tbody.innerHTML = ''
  allData?.forEach(item => {
    const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('id-ID') : '-'
    const badgeClass = item.kategori === 'Daily' ? 'bg-daily' : 'bg-reg'
    
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.nama_proyek}</strong></td>
        <td><span class="badge ${badgeClass}">${item.kategori}</span></td>
        <td>${item.status}</td>
        <td>${deadline}</td>
        <td>
          <button onclick="openEdit(${item.id})" style="margin-right:5px; color:#bb86fc; background:none; border:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
          <button onclick="deleteItem(${item.id})" style="color:#f8312f; background:none; border:none; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`
  })
}

// 6. UPDATE DATA (Edit & Check-in)
window.checkIn = async (id) => {
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('airdrop_projects').update({last_check_in:today}).eq('id',id)
  loadData() // Refresh UI
  showToast('Tugas Selesai!', 'success')
}

// -- Fitur Edit (Modal) --
window.openEdit = async (id) => {
  // Ambil data lama
  const { data } = await supabase.from('airdrop_projects').select('*').eq('id', id).single()
  
  if(data) {
    document.getElementById('editId').value = data.id
    document.getElementById('editNama').value = data.nama_proyek
    document.getElementById('editStatus').value = data.status
    document.getElementById('editNote').value = data.catatan
    
    // Tampilkan Modal
    document.getElementById('editModal').style.display = 'flex'
  }
}

window.closeEdit = () => {
  document.getElementById('editModal').style.display = 'none'
}

window.saveUpdate = async () => {
  const id = document.getElementById('editId').value
  const nama = document.getElementById('editNama').value
  const status = document.getElementById('editStatus').value
  const catatan = document.getElementById('editNote').value

  const { error } = await supabase.from('airdrop_projects').update({
    nama_proyek: nama, status, catatan
  }).eq('id', id)

  if(!error) {
    showToast('Data berhasil diupdate!', 'success')
    closeEdit()
    loadData()
  } else {
    showToast('Gagal update', 'error')
  }
}

// 7. DELETE DATA
window.deleteItem = async (id) => {
  if(confirm('Yakin ingin menghapus data ini selamanya?')) {
    const { error } = await supabase.from('airdrop_projects').delete().eq('id',id)
    if(!error) {
      showToast('Data dihapus', 'success')
      loadData()
    }
  }
}

// 8. UX: TOAST NOTIFICATION
window.showToast = (msg, type='info') => {
  const box = document.getElementById('toastBox')
  const div = document.createElement('div')
  div.classList.add('toast')
  
  // Ubah warna border sesuai tipe
  if(type === 'success') div.style.borderLeftColor = '#00d26a'
  if(type === 'error') div.style.borderLeftColor = '#f8312f'
  
  div.innerHTML = type === 'success' ? `<i class="fas fa-check-circle"></i> ${msg}` : msg
  box.appendChild(div)
  
  // Hapus elemen setelah 3 detik
  setTimeout(() => { div.remove() }, 3000)
}