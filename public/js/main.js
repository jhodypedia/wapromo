document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // 🔔 Toastr Config
  toastr.options = {
    closeButton: true,
    progressBar: true,
    newestOnTop: true,
    positionClass: "toast-top-right",
    timeOut: "3000"
  };

  /**
   * =====================
   * SESSION MANAGEMENT
   * =====================
   */
  function renderSessions(sessions) {
    const container = document.getElementById("sessions");
    if (!container) return; // ⛔ kalau bukan di halaman WA connect

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

    // bind tombol open
    container.querySelectorAll(".open-session").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sessionId = btn.dataset.session;
        openQrModal(sessionId, "Menunggu QR / Pairing...");
      });
    });

    // bind tombol delete
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
            toastr.error("Terjadi kesalahan server", "Error");
          }
        }
      });
    });
  }

  async function loadSessions() {
    const container = document.getElementById("sessions");
    if (!container) return; // ⛔ fix toastr muncul saat login page

    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();
      renderSessions(sessions);
    } catch (err) {
      toastr.error("Gagal memuat session", "Error");
    }
  }

  function openQrModal(sessionId, message = "Loading...") {
    document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
    document.getElementById("qrContainer").innerHTML =
      `<div class="text-muted">${message}</div>`;
    document.getElementById("qrNote").innerText = "";
    document.getElementById("qrModal").setAttribute("data-session", sessionId);
    new bootstrap.Modal(document.getElementById("qrModal")).show();
  }

  /**
   * =====================
   * CAMPAIGN MANAGEMENT
   * =====================
   */
  document.querySelectorAll(".delete-campaign").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirm = await Swal.fire({
        title: "Hapus Campaign?",
        text: "Data campaign dan target akan hilang.",
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
            location.reload();
          } else {
            toastr.error(json.error || "Gagal hapus campaign", "Error");
          }
        } catch (err) {
          toastr.error("Server error saat hapus campaign", "Error");
        }
      }
    });
  });

  // Detail campaign
  document.querySelectorAll(".view-detail").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      const template = btn.dataset.template;
      const status = btn.dataset.status;
      const targets = JSON.parse(btn.dataset.targets || "[]");

      const statusBadge = `<span class="badge bg-${
        status === "done"
          ? "success"
          : status === "running"
          ? "warning"
          : "secondary"
      }">${status}</span>`;

      const rows = targets.length
        ? targets
            .map(
              (t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${t.number}</td>
                <td><span class="badge bg-${
                  t.status === "success"
                    ? "success"
                    : t.status === "error"
                    ? "danger"
                    : t.status === "valid"
                    ? "primary"
                    : t.status === "invalid"
                    ? "secondary"
                    : "dark"
                }">${t.status}</span></td>
                <td class="small text-muted">${t.error || "-"}</td>
              </tr>`
            )
            .join("")
        : `<tr><td colspan="4" class="text-center text-muted">Belum ada target</td></tr>`;

      document.getElementById("campaignDetailBody").innerHTML = `
        <h5>${name}</h5>
        <p class="text-muted mb-2">
          Template: ${template} | Status: ${statusBadge}
        </p>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Nomor</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      new bootstrap.Modal(document.getElementById("campaignDetailModal")).show();
    });
  });

  /**
   * =====================
   * SOCKET LISTENERS
   * =====================
   */
  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      const activeSession = modal.getAttribute("data-session");
      if (activeSession === sessionId) {
        const el = document.getElementById("qrContainer");
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        document.getElementById("qrNote").innerText =
          "Scan QR ini di WhatsApp → Perangkat Tertaut";
        toastr.info("QR Code baru diterima", "Info");
      }
    });

    socket.on("wa_status", ({ sessionId, status }) => {
      loadSessions();
      if (status === "connected") {
        toastr.success(`Session ${sessionId} tersambung`, "Connected");
      } else if (status === "reconnecting") {
        toastr.warning(`Session ${sessionId} mencoba reconnect`, "Reconnecting");
      } else if (status === "disconnected") {
        toastr.error(`Session ${sessionId} terputus`, "Disconnected");
      }
    });
  }

  // Init hanya jika ada container sessions
  if (document.getElementById("sessions")) loadSessions();
});
