export type ShareChannel = "whatsapp" | "email"

export type AccountSharePayload = {
  roleLabel: string
  name: string
  email: string
  phone?: string
  password?: string
}

function normalizePhoneForWhatsapp(phone?: string) {
  const digits = String(phone || "").replace(/[^0-9]/g, "")
  if (!digits) return ""

  if (digits.startsWith("62")) {
    return digits
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`
  }

  if (digits.startsWith("8")) {
    return `62${digits}`
  }

  return digits
}

export function buildAccountShareMessage(payload: AccountSharePayload) {
  const appUrl = "https://justa4.vercel.app"
  const creatorUrl = "https://aegix-solutions.vercel.app"

  const lines = [
    "Halo, berikut informasi akun SIAKAD Anda:",
    "",
    `Role: ${payload.roleLabel}`,
    `Nama: ${payload.name}`,
    `Email: ${payload.email}`,
    `Nomor WhatsApp: ${payload.phone || "-"}`,
    `Password Sementara: ${payload.password || "(isi password belum tersedia)"}`,
    "",
    `Login Website: ${appUrl}`,
    "",
    "Silakan login dan segera ganti password setelah berhasil masuk.",
    "",
    `Created by Aegix Solutions: ${creatorUrl}`,
  ]

  return lines.join("\n")
}

export function openShareChannel(channel: ShareChannel, payload: AccountSharePayload) {
  const message = buildAccountShareMessage(payload)

  if (channel === "whatsapp") {
    const phone = normalizePhoneForWhatsapp(payload.phone)
    if (!phone) {
      throw new Error("Nomor WhatsApp belum tersedia")
    }

    const waUrl = new URL("https://web.whatsapp.com/send")
    waUrl.searchParams.set("phone", phone)
    waUrl.searchParams.set("text", message)

    const opened = window.open(waUrl.toString(), "_blank", "noopener,noreferrer")
    if (!opened) {
      throw new Error("Popup diblokir browser. Izinkan popup untuk mengirim akun.")
    }
    return
  }

  if (!payload.email) {
    throw new Error("Email belum tersedia")
  }

  const subject = encodeURIComponent("Informasi Akun SIAKAD")
  const body = encodeURIComponent(message)
  const mailtoUrl = `mailto:${encodeURIComponent(payload.email)}?subject=${subject}&body=${body}`
  const opened = window.open(mailtoUrl, "_blank", "noopener,noreferrer")
  if (!opened) {
    throw new Error("Popup diblokir browser. Izinkan popup untuk mengirim akun.")
  }
}
