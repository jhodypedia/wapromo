document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // 🔔 Toastr setup
  toastr.options = {
    closeButton: true,
    progressBar: true,
    newestOnTop: true,
    positionClass: "toast-top-right",
    timeOut: "3000"
  };

  /* =======================================================
   * SESSION MANAGEMENT (Connect Page)
   * ======================================================= */

  function renderSessions(sessions) {
    const container = document.getElementById("sessions");
    if (!container) return;

    container.innerHTML = sessions.length
      ? sessions
          .map(
            (s) => `
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="card h-100 d-flex flex-column">
              <div class="card-body flex-grow-1">
                <div class="fw-semibold">${s.label || s.sessionId}</div>
                <div class="small text-muted">ID: ${s.sessionId}</div>
                <span class="badge mt-2 bg-${
                  s.status === "connected"
                    ? "success"
                    : s.status === "reconnecting"
                    ? "warning"
                    : "secondary"
                }">${s.status}</span>
              </div>
              <div class="card-footer d-flex justify-content-between">
                <button class="btn btn-sm btn-outline-primary open-session" data-session="${s.sessionId}">
                  <i class="fa fa-qrcode me-1"></i>Buka
                </button>
                <button class="btn btn-sm btn-outline-danger delete-session" data-session="${s.sessionId}">
                  <i class="fa fa-trash me-1"></i>Hapus
                </button>
              </div>
            </div>
          </div>`
          )
          .join("")
      : `<div class="col-12 text-muted">Belum ada session, buat baru dulu.</div>`;

    // tombol buka session
    container.querySelectorAll(".open-session").forEach((btn) => {
      btn.addEventListener("click", () => {
        openQrModal(btn.dataset.session, "Menunggu QR / Pairing...");
      });
    });

    // tombol hapus session
    container.querySelectorAll(".delete-session").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sessionId = btn.dataset.session;
        const confirm = await Swal.fire({
          title: "Hapus Session?",
          text: `Apakah Anda yakin ingin menghapus session ${sessionId}?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Ya, hapus",
          cancelButtonText: "Batal",
          confirmButtonColor: "#d33",
          cancelButtonColor: "#6c757d"
        });

        if (confirm.isConfirmed) {
          try {
            const res = await fetch(`/wa/delete/${sessionId}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
              toastr.success(`Session ${sessionId} berhasil dihapus`, "Deleted");
              loadSessions();
            } else {
              toastr.error(json.error || "Gagal menghapus session", "Error");
            }
          } catch (err) {
            toastr.error("Server error saat hapus session", "Error");
          }
        }
      });
    });
  }

  async function loadSessions() {
    const container = document.getElementById("sessions");
    if (!container) return; // 👉 biar tidak error di halaman lain

    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();
      renderSessions(sessions);
    } catch {
      container.innerHTML = `<div class="col-12 text-muted">Gagal memuat session</div>`;
    }
  }

  function openQrModal(sessionId, message = "Loading...") {
    document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
    document.getElementById("qrContainer").innerHTML = `<div class="text-muted">${message}</div>`;
    document.getElementById("qrNote").innerText = "";
    document.getElementById("qrModal").setAttribute("data-session", sessionId);
    new bootstrap.Modal(document.getElementById("qrModal")).show();
  }

  // Form tambah session
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim()
      };

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();
      openQrModal(data.sessionId, "Menunggu QR ...");

      try {
        const res = await fetch("/wa/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
          toastr.success("Session berhasil dibuat", "Berhasil");
          loadSessions();
        } else {
          toastr.error(json.error || "Gagal membuat session", "Error");
        }
      } catch {
        toastr.error("Server error saat membuat session", "Error");
      }
    });
  }

  // Form pairing
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();

      if (!sessionId || !phone) {
        toastr.warning("Isi SessionId & Nomor WA dulu", "Perhatian");
        return;
      }

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();
      openQrModal(sessionId, "Menunggu kode pairing...");

      try {
        const res = await fetch("/wa/pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, phone })
        }).then((r) => r.json());

        if (res.success) {
          document.getElementById("qrContainer").innerHTML = `
            <div class="p-3 bg-light rounded border fw-bold text-primary fs-4 animate__animated animate__fadeIn">${res.code}</div>`;
          document.getElementById("qrNote").innerText = "Masukkan kode ini di WhatsApp → Perangkat Tertaut";
          toastr.success("Pairing code berhasil dibuat", "Berhasil");
        } else {
          document.getElementById("qrContainer").innerHTML = `<div class="text-danger">Gagal: ${res.error}</div>`;
          toastr.error(res.error || "Gagal generate pairing code", "Error");
        }
      } catch {
        toastr.error("Server error saat generate pairing code", "Error");
      }
    });
  }

  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      const active = modal.getAttribute("data-session");
      if (active === sessionId) {
        const el = document.getElementById("qrContainer");
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        document.getElementById("qrNote").innerText = "Scan QR ini di WhatsApp → Perangkat Tertaut";
      }
    });

    socket.on("wa_status", ({ sessionId, status }) => {
      loadSessions();
      if (status === "connected") toastr.success(`Session ${sessionId} tersambung`, "Connected");
      if (status === "reconnecting") toastr.warning(`Session ${sessionId} reconnecting`, "Reconnecting");
      if (status === "disconnected") toastr.error(`Session ${sessionId} terputus`, "Disconnected");
    });
  }

  loadSessions(); // init

  /* =======================================================
   * CAMPAIGN MANAGEMENT (Campaign List Page)
   * ======================================================= */

  document.querySelectorAll(".detail-campaign").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/campaigns/${id}/detail`);
        const json = await res.json();

        if (!json.success) return toastr.error(json.error || "Gagal memuat detail", "Error");

        const cp = json.data;
        const tbody = cp.targets
          .map(
            (t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${t.number}</td>
              <td>
                <span class="badge bg-${
                  t.status === "success"
                    ? "success"
                    : t.status === "error"
                    ? "danger"
                    : t.status === "valid"
                    ? "primary"
                    : t.status === "invalid"
                    ? "secondary"
                    : "dark"
                }">${t.status}</span>
              </td>
              <td>${t.error || "-"}</td>
            </tr>`
          )
          .join("");

        document.getElementById("detailTitle").innerText = `Detail Campaign: ${cp.name}`;
        document.getElementById("detailBody").innerHTML = `
          <p><strong>Template:</strong> ${cp.template?.name || "-"}</p>
          <p><strong>Status:</strong>
            <span class="badge bg-${
              cp.status === "done" ? "success" : cp.status === "running" ? "warning" : "secondary"
            }">${cp.status}</span>
          </p>
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead>
                <tr><th>#</th><th>Nomor</th><th>Status</th><th>Error</th></tr>
              </thead>
              <tbody>${tbody}</tbody>
            </table>
          </div>
        `;

        new bootstrap.Modal(document.getElementById("detailModal")).show();
      } catch (err) {
        toastr.error("Server error saat ambil detail", "Error");
      }
    });
  });

  document.querySelectorAll(".delete-campaign").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirm = await Swal.fire({
        title: "Hapus Campaign?",
        text: "Data target campaign juga akan ikut terhapus.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d"
      });

      if (confirm.isConfirmed) {
        try {
          const res = await fetch(`/campaigns/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
            toastr.success("Campaign berhasil dihapus", "Deleted");
            setTimeout(() => window.location.reload(), 800);
          } else {
            toastr.error(json.error || "Gagal menghapus campaign", "Error");
          }
        } catch {
          toastr.error("Server error saat hapus campaign", "Error");
        }
      }
    });
  });
});
