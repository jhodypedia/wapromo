document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // Load sessions
  async function loadSessions() {
    const res = await fetch("/wa/connect/list");
    const sessions = await res.json();
    document.getElementById("sessions").innerHTML = sessions
      .map(
        (s) => `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card h-100 clickable shadow-sm" data-session="${s.sessionId}">
          <div class="card-body d-flex flex-column justify-content-between">
            <div>
              <div class="fw-semibold">${s.label || s.sessionId}</div>
              <div class="small text-muted">ID: ${s.sessionId}</div>
            </div>
            <span class="badge mt-2 bg-${
              s.status === "connected"
                ? "success"
                : s.status === "reconnecting"
                ? "warning"
                : "secondary"
            }">${s.status}</span>
          </div>
        </div>
      </div>`
      )
      .join("");

    // klik session card
    document.querySelectorAll(".clickable").forEach((el) => {
      el.addEventListener("click", () => {
        const sessionId = el.dataset.session;
        document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
        document.getElementById("qrContainer").innerHTML =
          "<div class='text-muted'>Menunggu QR ...</div>";
        document.getElementById("qrModal").setAttribute("data-session", sessionId);
        new bootstrap.Modal(document.getElementById("qrModal")).show();
      });
    });
  }

  // Buat session baru
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim(),
      };

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();

      document.getElementById("qrModalTitle").innerText = `Session: ${data.sessionId}`;
      document.getElementById("qrContainer").innerHTML =
        "<div class='text-muted'>Menunggu QR ...</div>";
      document.getElementById("qrModal").setAttribute("data-session", data.sessionId);
      new bootstrap.Modal(document.getElementById("qrModal")).show();

      setTimeout(async () => {
        await fetch("/wa/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }, 6000);
    });
  }

  // Pairing Form
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();

      document.getElementById("qrModalTitle").innerText = `Pairing: ${sessionId}`;
      document.getElementById("qrContainer").innerHTML =
        "<div class='text-muted'>Menunggu kode pairing...</div>";
      document.getElementById("qrModal").setAttribute("data-session", sessionId);
      new bootstrap.Modal(document.getElementById("qrModal")).show();

      setTimeout(async () => {
        const res = await fetch("/wa/pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, phone }),
        }).then((r) => r.json());

        if (res.success) {
          const chars = res.code.trim().split("");
          document.getElementById("qrContainer").innerHTML = `
            <div class="pairing-code-flex">
              ${chars.map((c) => `<span class="pair-box">${c}</span>`).join("")}
            </div>`;
          document.getElementById("qrNote").innerText =
            "Masukkan kode ini di WhatsApp → Perangkat Tertaut";
        } else {
          document.getElementById("qrContainer").innerHTML =
            `<div class="text-danger">Gagal: ${res.error || "Tidak bisa generate kode"}</div>`;
        }
      }, 6000);
    });
  }

  // Socket: QR update
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
      }
    });

    socket.on("wa_status", () => {
      loadSessions();
    });
  }

  if (document.getElementById("sessions")) loadSessions();
});
