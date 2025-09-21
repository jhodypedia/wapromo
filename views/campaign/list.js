<% layout('layouts/main') %>
<div class="d-flex justify-content-between align-items-center mb-3">
  <h4 class="mb-0"><i class="fa fa-bullhorn me-2"></i>Campaign</h4>
  <a class="btn btn-primary" href="/campaigns/new"><i class="fa fa-plus me-2"></i>Buat Campaign</a>
</div>
<div class="table-responsive card">
  <table class="table table-hover mb-0">
    <thead><tr><th>Nama</th><th>Template</th><th>Session</th><th>Delay (ms)</th><th>Status</th><th>Valid/Invalid</th><th>Aksi</th></tr></thead>
    <tbody>
      <% campaigns.forEach(c => { const valid=(c.Targets||[]).filter(t=>t.status==='valid').length; const invalid=(c.Targets||[]).filter(t=>t.status==='invalid').length; %>
      <tr>
        <td><%= c.name %></td>
        <td><%= c.Template?.title %></td>
        <td><code><%= c.sessionId %></code></td>
        <td><%= c.speedMinMs %>-<%= c.speedMaxMs %></td>
        <td><span class="badge <%= c.status==='done'?'bg-success':(c.status==='running'?'bg-warning':'bg-secondary') %>"><%= c.status %></span></td>
        <td><span class="badge bg-success"><%= valid %></span> / <span class="badge bg-danger"><%= invalid %></span></td>
        <td>
          <% if (c.status==='idle') { %>
          <form method="POST" action="/campaigns/<%= c.id %>/run" onsubmit="return confirm('Jalankan campaign ini?')">
            <button class="btn btn-sm btn-primary"><i class="fa fa-play"></i> Run</button>
          </form>
          <% } %>
        </td>
      </tr>
      <% }) %>
    </tbody>
  </table>
</div>

<script>
const socket = io();
socket.on('number_checked', d => { toastr.info(`Verifikasi ${d.number}: ${d.status}`); });
socket.on('campaign_progress', p => { toastr[p.status==='success'?'success':'error'](`Target ${p.number}: ${p.status}`); });
socket.on('campaign_done', d => { Swal.fire({icon:'success',title:'Campaign selesai',text:`ID: ${d.campaignId}`}).then(()=>location.reload()); });
</script>
