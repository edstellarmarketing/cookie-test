export function setCookieId(cookieId) {
  document.cookie = `visitor_id=${cookieId}; path=/; max-age=7776000; SameSite=Lax`
}

export function getCookieId() {
  const match = document.cookie.match(/(?:^|;\s*)visitor_id=([^;]*)/)
  return match ? match[1] : null
}

export function removeCookieId() {
  document.cookie = 'visitor_id=; path=/; max-age=0'
}
