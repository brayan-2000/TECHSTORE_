export async function api(route, options={}) {
 const response = await fetch(`/api${route}`,options)
 let data
 try { data = await response.json() } catch { throw new Error('El servidor devolvió una respuesta inesperada.') }
 if(!response.ok) throw new Error(data.mensaje || `Error HTTP ${response.status}`)
 return data
}
