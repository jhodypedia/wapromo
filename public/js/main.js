document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  if (socket) {
    // tampilkan QR realtime
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const el = document.getElementById(`qr-${sessionId}`);
      if (el) {
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        toastr.info("QR baru untuk " + sessionId);
      }
    });

    // status realtime
    socket.on("wa_status", ({ sessionId, status }) => {
      toastr.success(`Session ${sessionId}: ${status}`);
    });
  }

  // pairing 6 digit
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();
      const res = await fetch("/wa/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone }),
      }).then((r) => r.json());

      if (res.success) {
        document.getElementById("pairResult").innerHTML = `
          <div class="h4 text-primary">${res.code}</div>
          <div>Masukkan kode ini di WhatsApp → Perangkat Tertaut</div>`;
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: res.error || "Error" });
      }
    });
  }
});
