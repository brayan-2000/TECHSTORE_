export const money = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n)
export const escapeHtml = v => String(v??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
