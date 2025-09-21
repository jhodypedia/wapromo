document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // Toastr setup (hanya untuk notifikasi)
  toastr.options = {
    closeButton: true,
    progressBar: true,
    newestOnTop: true,
    positionClass: "toast-top-right",
    timeOut: "3000"
  };

  // ===============================
  // 🔹 Sessions
  // ===============================
  async function loadSessions() {
    const container = document.getElementById("sessions");
    if (!container) return;

    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();

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

      // Bind event listener (pakai delegasi agar tidak acak²an)
      container.querySelectorAll(".open-session").forEach((btn) =>
        btn.addEventListener("click", () => {
          openQrModal(btn.dataset.session, "Menunggu QR / Pairing...");
        })
      );

      container.querySelectorAll(".delete-session").forEach((btn) =>
        btn.addEventListener("click", () => deleteSession(btn.dataset.session))
      );
    } catch (err) {
      console.error("❌ loadSessions error:", err);
      // jangan munculkan toastr kalau user belum login
      if (err.status !== 401) {
        toastr.error("Gagal memuat session", "Error");
      }
    }
  }

  async function deleteSession(sessionId) {
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
          toastr.success(`Session ${sessionId} dihapus`, "Deleted");
          loadSessions();
        } else {
          toastr.error(json.error || "Gagal hapus session", "Error");
        }
      } catch (err) {
        toastr.error("Server error saat hapus session", "Error");
      }
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

  // ===============================
  // 🔹 Campaigns
  // ===============================
  function bindCampaignActions() {
    document.querySelectorAll(".btn-run-campaign").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i>`;
        try {
          const res = await fetch(`/campaigns/${id}/run`, { method: "POST" });
          if (res.ok) {
            toastr.success("Campaign dijalankan", "Success");
            location.reload();
          } else {
            toastr.error("Gagal menjalankan campaign", "Error");
          }
        } catch {
          toastr.error("Server error jalankan campaign", "Error");
        }
      });
    });

    document.querySelectorAll(".btn-delete-campaign").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await Swal.fire({
          title: "Hapus Campaign?",
          text: "Data target & progress juga akan dihapus.",
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
              toastr.success("Campaign dihapus", "Deleted");
              location.reload();
            } else {
              toastr.error(json.error || "Gagal hapus campaign", "Error");
            }
          } catch {
            toastr.error("Server error hapus campaign", "Error");
          }
        }
      });
    });

    document.querySelectorAll(".btn-detail-campaign").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        try {
          const res = await fetch(`/campaigns/${id}`);
          const html = await res.text();
          document.getElementById("campaignDetailBody").innerHTML = html;
          new bootstrap.Modal(document.getElementById("campaignDetailModal")).show();
        } catch {
          toastr.error("Gagal memuat detail campaign", "Error");
        }
      });
    });
  }

  // ===============================
  // 🔹 Socket listener
  // ===============================
  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      if (modal && modal.getAttribute("data-session") === sessionId) {
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
      if (status === "connected") toastr.success(`Session ${sessionId} tersambung`);
      if (status === "reconnecting") toastr.warning(`Session ${sessionId} reconnecting`);
      if (status === "disconnected") toastr.error(`Session ${sessionId} terputus`);
    });
  }

  // ===============================
  // 🔹 Init
  // ===============================
  loadSessions();
  bindCampaignActions();
});
