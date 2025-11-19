import { createClient } from '@supabase/supabase-js'

// 1. SETUP (Mengambil dari Env Vercel)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const APP_PASS = import.meta.env.VITE_APP_PASSWORD

// 2. FUNGSI HELPER: AUTO LINK (Regex Magic)
function formatText(text) {
  if (!text) return '-';
  
  // Ubah baris baru jadi <br> dan URL jadi <a>
  return text
    .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Mencegah XSS sederhana
    .replace(/\n/g, '<br>')
    .replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" class="active-link"><i class="fas fa-external-link-alt"></i> Link</a>'
    );
    // Tips: Saya ubah text linknya jadi kata "Link" + Icon biar tabel tidak berantakan jika URL-nya super panjang
}

// 3. LOGIN SYSTEM
window.login = () => {
  const input = document.getElementById('passInput').value
  if(input === APP_PASS) {
    document.getElementById('loginOverlay').classList.remove('active')
    document.getElementById('app').style.display = 'flex'
    loadData()
  } else {
    const err = document.getElementById('errorMsg')
    err.style.display = 'block'
    setTimeout(() => err.style.display = 'none', 2000)
  }
}

// 4. NAVIGASI
window.nav = (id) => {
  document.querySelectorAll('main section').forEach(s => s.style.display='none')
  document.getElementById(id).style.display='block'
  
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'))
  event.currentTarget.classList.add('active')
  
  loadData()
}

// 5. CRUD: CREATE (Input Data)
const form = document.getElementById('addForm')
if(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    showToast('Menyimpan...', 'info')

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
}

// 6. CRUD: READ (Load Data)
async function loadData() {
  const today = new Date().toISOString().split('T')[0]

  // A. Load Daily
  const dailyDiv = document.getElementById('dailyList')
  if(dailyDiv) {
    const { data: dailyData } = await supabase.from('airdrop_projects').select('*').eq('kategori','Daily').order('nama_proyek')
    dailyDiv.innerHTML = ''
    
    dailyData?.forEach(item => {
      const isDone = item.last_check_in === today
      const cardClass = isDone ? 'daily-card done' : 'daily-card'
      const btnStyle = isDone ? 'border:1px solid #00d26a; color:#00d26a; background:transparent;' : 'background:var(--primary); color:white; border:none;'
      const btnText = isDone ? '<i class="fas fa-check"></i> Sudah Selesai' : 'Garap Sekarang'
      
      const noteHtml = formatText(item.catatan) // Gunakan Auto Link

      dailyDiv.innerHTML += `
        <div class="${cardClass}">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="color:white; font-size:1.1rem;">${item.nama_proyek}</h3>
              <button onclick="deleteItem(${item.id})" style="background:none; border:none; color:#555; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
            <p style="color:#ccc; font-size:0.9rem; margin-top:10px; line-height:1.5;">${noteHtml}</p>
          </div>
          <button onclick="checkIn(${item.id})" style="width:100%; padding:10px; border-radius:6px; margin-top:20px; cursor:pointer; ${btnStyle}">
            ${btnText}
          </button>
        </div>`
    })
  }

  // B. Load Rekap Table
  const tbody = document.querySelector('#recapTable tbody')
  if(tbody) {
    const { data: allData } = await supabase.from('airdrop_projects').select('*').order('created_at',{ascending:false})
    tbody.innerHTML = ''
    
    allData?.forEach(item => {
      const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('id-ID') : '-'
      const badge = item.kategori === 'Daily' ? 'bg-daily' : 'bg-reg'
      const noteHtml = formatText(item.catatan) // Gunakan Auto Link

      tbody.innerHTML += `
        <tr>
          <td><strong>${item.nama_proyek}</strong></td>
          <td><span class="badge ${badge}">${item.kategori}</span></td>
          <td>${item.status}</td>
          <td>${deadline}</td>
          <td style="max-width:300px; font-size:0.85rem;">${noteHtml}</td>
          <td>
            <button onclick="openEdit(${item.id})" style="margin-right:8px; color:#bb86fc; background:none; border:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem(${item.id})" style="color:#f8312f; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`
    })
  }
}

// 7. CRUD: UPDATE (Check-In & Edit)
window.checkIn = async (id) => {
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('airdrop_projects').update({last_check_in:today}).eq('id',id)
  loadData()
  showToast('Tugas Daily Selesai!', 'success')
}

// Edit System
window.openEdit = async (id) => {
  const { data } = await supabase.from('airdrop_projects').select('*').eq('id', id).single()
  if(data) {
    document.getElementById('editId').value = data.id
    document.getElementById('editNama').value = data.nama_proyek
    document.getElementById('editStatus').value = data.status
    document.getElementById('editNote').value = data.catatan
    document.getElementById('editModal').style.display = 'flex'
  }
}
window.closeEdit = () => { document.getElementById('editModal').style.display = 'none' }

window.saveUpdate = async () => {
  showToast('Updating...', 'info')
  const id = document.getElementById('editId').value
  const nama = document.getElementById('editNama').value
  const status = document.getElementById('editStatus').value
  const catatan = document.getElementById('editNote').value
  
  const { error } = await supabase.from('airdrop_projects').update({ nama_proyek:nama, status, catatan }).eq('id',id)
  
  if(!error) {
    showToast('Data Terupdate!', 'success')
    closeEdit()
    loadData()
  }
}

// 8. CRUD: DELETE
window.deleteItem = async (id) => {
  if(confirm('Hapus permanen?')) {
    const { error } = await supabase.from('airdrop_projects').delete().eq('id',id)
    if(!error) {
      showToast('Data Terhapus', 'success')
      loadData()
    }
  }
}

// 9. UI UTILS: Toast
window.showToast = (msg, type='info') => {
  const box = document.getElementById('toastBox')
  const div = document.createElement('div')
  div.className = 'toast'
  div.innerHTML = type === 'success' ? `<i class="fas fa-check-circle"></i> ${msg}` : msg
  if(type === 'error') div.style.borderLeftColor = '#f8312f'
  
  box.appendChild(div)
  setTimeout(() => div.remove(), 3000)
}