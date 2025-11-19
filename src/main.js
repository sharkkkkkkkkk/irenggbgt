import { createClient } from '@supabase/supabase-js'

// SETUP SUPABASE
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
const APP_PASS = import.meta.env.VITE_APP_PASSWORD

// VARIABLE GLOBAL
let globalData = [];

// HELPER: FORMAT TEXT (Link & Copy)
function formatText(text) {
  if (!text) return '-';
  return text
    .replace(/</g, "&lt;")
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="active-link"><i class="fas fa-external-link-alt"></i> Link</a>')
    .replace(/(0x[a-fA-F0-9]{6,})/g, '<span class="copy-text" onclick="copyToClip(\'$1\')" title="Salin">$1</span>');
}

// UTILS
window.copyToClip = (text) => {
  navigator.clipboard.writeText(text);
  showToast('Teks disalin!', 'success');
}

window.showToast = (msg, type='info') => {
  const box = document.getElementById('toastBox');
  const div = document.createElement('div');
  div.className = 'toast';
  div.innerHTML = type === 'success' ? `<i class="fas fa-check"></i> ${msg}` : msg;
  if(type === 'error') div.style.borderLeftColor = '#f8312f';
  box.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// LOGIN
window.login = () => {
  const input = document.getElementById('passInput').value;
  if(input === APP_PASS) {
    document.getElementById('loginOverlay').classList.remove('active');
    document.getElementById('app').style.display = 'flex';
    loadData();
  } else {
    const err = document.getElementById('errorMsg');
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2000);
  }
}

// NAVIGASI (Desktop & Mobile Sync)
window.nav = (id) => {
  document.querySelectorAll('main section').forEach(s => s.style.display='none');
  document.getElementById(id).style.display='block';
  
  // Update active class di Sidebar & Bottom Nav
  document.querySelectorAll('.sidebar li, .bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[data-target="${id}"]`).forEach(el => el.classList.add('active'));
  
  filterData(); // Render ulang data
}

// CREATE
const form = document.getElementById('addForm');
if(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('Menyimpan...', 'info');
    const nama = document.getElementById('nama').value;
    const kategori = document.getElementById('kategori').value;
    const status = document.getElementById('status').value;
    const deadline = document.getElementById('deadline').value;
    const catatan = document.getElementById('note').value;

    const { error } = await supabase.from('airdrop_projects').insert([{ 
      nama_proyek: nama, kategori, status, deadline: deadline||null, catatan 
    }]);

    if(!error) {
      showToast('Berhasil!', 'success');
      form.reset();
      loadData();
    } else {
      showToast(error.message, 'error');
    }
  });
}

// READ & LOAD
async function loadData() {
  const { data } = await supabase.from('airdrop_projects').select('*').order('created_at',{ascending:false});
  globalData = data || [];
  filterData(); // Panggil render via filter
}

// SEARCH & RENDER
window.filterData = () => {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  const filtered = globalData.filter(item => 
    item.nama_proyek.toLowerCase().includes(keyword) || 
    (item.catatan && item.catatan.toLowerCase().includes(keyword))
  );
  renderUI(filtered);
}

function renderUI(data) {
  const today = new Date().toISOString().split('T')[0];
  
  // STATS
  const dailyTasks = data.filter(i => i.kategori === 'Daily');
  const dailyDone = dailyTasks.filter(i => i.last_check_in === today).length;
  document.getElementById('statTotal').innerText = data.length;
  document.getElementById('statDone').innerText = `${dailyDone}/${dailyTasks.length}`;
  
  const percent = dailyTasks.length > 0 ? Math.round((dailyDone/dailyTasks.length)*100) : 0;
  document.getElementById('progressBar').style.width = `${percent}%`;
  document.getElementById('progressText').innerText = `${percent}%`;

  // DAILY LIST
  const dailyDiv = document.getElementById('dailyList');
  const emptyDaily = document.getElementById('emptyDaily');
  dailyDiv.innerHTML = '';
  
  if(dailyTasks.length === 0) emptyDaily.style.display = 'block';
  else {
    emptyDaily.style.display = 'none';
    dailyTasks.forEach(item => {
      const isDone = item.last_check_in === today;
      const cardClass = isDone ? 'daily-card done' : 'daily-card';
      const btnStyle = isDone ? 'border:1px solid #00d26a; color:#00d26a; background:transparent;' : 'background:var(--primary); color:white; border:none;';
      const btnText = isDone ? '<i class="fas fa-check"></i> Selesai' : 'Garap Sekarang';
      
      dailyDiv.innerHTML += `
        <div class="${cardClass}">
          <div>
            <div style="display:flex; justify-content:space-between;">
              <h3>${item.nama_proyek}</h3>
              <button onclick="deleteItem(${item.id})" style="background:none; border:none; color:#666; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
            <p style="color:#bbb; font-size:0.85rem; margin-top:10px;">${formatText(item.catatan)}</p>
          </div>
          <button onclick="checkIn(${item.id})" style="width:100%; padding:10px; margin-top:15px; border-radius:6px; cursor:pointer; ${btnStyle}">
            ${btnText}
          </button>
        </div>`;
    });
  }

  // RECAP TABLE
  const tbody = document.querySelector('#recapTable tbody');
  const emptyRecap = document.getElementById('emptyRecap');
  tbody.innerHTML = '';
  
  if(data.length === 0) emptyRecap.style.display = 'block';
  else {
    emptyRecap.style.display = 'none';
    data.forEach(item => {
      const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('id-ID') : '-';
      const badge = item.kategori === 'Daily' ? 'bg-daily' : 'bg-reg';
      
      tbody.innerHTML += `
        <tr>
          <td><strong>${item.nama_proyek}</strong></td>
          <td><span class="badge" style="background:#333">${item.kategori}</span></td>
          <td>${item.status}</td>
          <td>${deadline}</td>
          <td style="font-size:0.85rem; max-width:200px;">${formatText(item.catatan)}</td>
          <td>
            <button onclick="openEdit(${item.id})" style="margin-right:10px; color:#d94bf3; background:none; border:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem(${item.id})" style="color:#f8312f; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    });
  }
}

// UPDATE ACTIONS
window.checkIn = async (id) => {
  await supabase.from('airdrop_projects').update({last_check_in: new Date()}).eq('id',id);
  loadData();
  showToast('Tugas Selesai!', 'success');
}

window.deleteItem = async (id) => {
  if(confirm('Hapus permanen?')) {
    await supabase.from('airdrop_projects').delete().eq('id',id);
    loadData();
    showToast('Terhapus', 'success');
  }
}

window.openEdit = async (id) => {
  const { data } = await supabase.from('airdrop_projects').select('*').eq('id', id).single();
  if(data) {
    document.getElementById('editId').value = data.id;
    document.getElementById('editNama').value = data.nama_proyek;
    document.getElementById('editStatus').value = data.status;
    document.getElementById('editNote').value = data.catatan;
    document.getElementById('editModal').style.display = 'flex';
  }
}
window.closeEdit = () => document.getElementById('editModal').style.display = 'none';

window.saveUpdate = async () => {
  const id = document.getElementById('editId').value;
  const nama = document.getElementById('editNama').value;
  const status = document.getElementById('editStatus').value;
  const note = document.getElementById('editNote').value;
  
  const { error } = await supabase.from('airdrop_projects').update({
    nama_proyek: nama, status, catatan: note
  }).eq('id',id);

  if(!error) {
    showToast('Data Diupdate', 'success');
    closeEdit();
    loadData();
  }
}