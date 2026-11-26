import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { categorias as initialCategories, productos as initialProducts, promociones as initialPromotions } from './data.js'
import { db } from './firebase.js'

const app = express()
app.use(express.json({ limit: '50kb' }))

const collections = {
 categories: 'categorias',
 products: 'productos',
 promotions: 'promociones',
 clients: 'clientes',
 orders: 'pedidos'
}

const readCollection = async (name) => {
 const snapshot = await db.collection(name).get()
 return snapshot.docs
  .map(document => ({ id: Number(document.id), ...document.data() }))
  .sort((a,b) => Number(a.id)-Number(b.id))
}

const getById = async (name,id) => {
 const document = await db.collection(name).doc(String(id)).get()
 return document.exists ? { id:Number(document.id), ...document.data() } : null
}

const nextId = async (name,minimum=0) => {
 const items = await readCollection(name)
 return Math.max(minimum,...items.map(item=>Number(item.id)||0))+1
}

const save = (name,item) => db.collection(name).doc(String(item.id)).set(item)
const remove = (name,id) => db.collection(name).doc(String(id)).delete()

const seedCollection = async (name,items) => {
 const snapshot = await db.collection(name).limit(1).get()
 if (!snapshot.empty) return
 const batch = db.batch()
 for (const item of items) batch.set(db.collection(name).doc(String(item.id)),item)
 await batch.commit()
}

const initializeFirestore = async () => {
 await seedCollection(collections.categories,initialCategories)
 await seedCollection(collections.products,initialProducts)
 await seedCollection(collections.promotions,initialPromotions)
}

app.get('/api', (_req,res)=>res.json({
 nombre:'TechStore Perú API',
 endpoints:['/api/productos','/api/categorias','/api/promociones','/api/clientes','/api/pedidos']
}))

app.get('/api/prueba-firebase', async (_req,res)=>{
 try {
  await db.collection('_sistema').doc('conexion').set({
   mensaje:'Firebase conectado correctamente',
   fecha:new Date().toISOString()
  })
  return res.json({conectado:true,mensaje:'Firebase conectado correctamente'})
 } catch (error) {
  console.error('Error al probar la conexión con Firebase:',error)
  return res.status(500).json({conectado:false,mensaje:'No se pudo conectar con Firebase.'})
 }
})

const sendEditor = (req,res) => {
 if(req.get('sec-fetch-mode')!=='navigate'||req.get('sec-fetch-dest')!=='document'||!req.get('accept')?.includes('text/html'))return false
 res.sendFile(path.resolve(__dirname,'../api-resource-editor.html'))
 return true
}

const normalizeCategory = (input) => {
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const nombre=typeof input.nombre==='string'?input.nombre.trim():''
 const slug=typeof input.slug==='string'?input.slug.trim().toLowerCase():''
 const icono=typeof input.icono==='string'?input.icono.trim():''
 return nombre&&icono&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)?{nombre,slug,icono}:null
}

app.get('/api/categorias', async (req,res)=>{
 if(sendEditor(req,res))return
 try { return res.json(await readCollection(collections.categories)) }
 catch (error) { console.error('Error al obtener categorías:',error); return res.status(500).json({mensaje:'No se pudieron obtener las categorías.'}) }
})

app.post('/api/categorias', async (req,res)=>{
 try {
  const category=normalizeCategory(req.body)
  if(!category)return res.status(400).json({mensaje:'Ingresa nombre, slug válido e icono para la categoría.'})
  const categories=await readCollection(collections.categories)
  if(categories.some(item=>item.slug===category.slug))return res.status(409).json({mensaje:'Ya existe una categoría con ese slug.'})
  const item={id:await nextId(collections.categories),...category}
  await save(collections.categories,item)
  return res.status(201).json(item)
 } catch (error) { console.error('Error al crear categoría:',error); return res.status(500).json({mensaje:'No se pudo crear la categoría.'}) }
})

app.put('/api/categorias/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.categories,id)
  if(!current)return res.status(404).json({mensaje:'Categoría no encontrada'})
  const category=normalizeCategory(req.body)
  if(!category)return res.status(400).json({mensaje:'Ingresa nombre, slug válido e icono para la categoría.'})
  const categories=await readCollection(collections.categories)
  if(categories.some(item=>item.id!==id&&item.slug===category.slug))return res.status(409).json({mensaje:'Ya existe una categoría con ese slug.'})
  const item={id,...category}
  await save(collections.categories,item)
  return res.json(item)
 } catch (error) { console.error('Error al actualizar categoría:',error); return res.status(500).json({mensaje:'No se pudo actualizar la categoría.'}) }
})

app.delete('/api/categorias/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.categories,id)
  if(!current)return res.status(404).json({mensaje:'Categoría no encontrada'})
  const products=await readCollection(collections.products)
  if(products.some(product=>product.categoriaId===id))return res.status(409).json({mensaje:'No puedes eliminar una categoría que contiene productos.'})
  await remove(collections.categories,id)
  return res.json({mensaje:'Categoría eliminada',categoria:current})
 } catch (error) { console.error('Error al eliminar categoría:',error); return res.status(500).json({mensaje:'No se pudo eliminar la categoría.'}) }
})

const normalizePromotion = (input) => {
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const titulo=typeof input.titulo==='string'?input.titulo.trim():''
 const descripcion=typeof input.descripcion==='string'?input.descripcion.trim():''
 const codigo=typeof input.codigo==='string'?input.codigo.trim().toUpperCase():''
 return titulo&&descripcion&&codigo&&typeof input.activa==='boolean'?{titulo,descripcion,codigo,activa:input.activa}:null
}

app.get('/api/promociones', async (req,res)=>{
 if(sendEditor(req,res))return
 try { return res.json(await readCollection(collections.promotions)) }
 catch (error) { console.error('Error al obtener promociones:',error); return res.status(500).json({mensaje:'No se pudieron obtener las promociones.'}) }
})

app.post('/api/promociones', async (req,res)=>{
 try {
  const promotion=normalizePromotion(req.body)
  if(!promotion)return res.status(400).json({mensaje:'Completa título, descripción, código y estado de la promoción.'})
  const promotions=await readCollection(collections.promotions)
  if(promotions.some(item=>item.codigo===promotion.codigo))return res.status(409).json({mensaje:'Ya existe una promoción con ese código.'})
  const item={id:await nextId(collections.promotions),...promotion}
  await save(collections.promotions,item)
  return res.status(201).json(item)
 } catch (error) { console.error('Error al crear promoción:',error); return res.status(500).json({mensaje:'No se pudo crear la promoción.'}) }
})

app.put('/api/promociones/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.promotions,id)
  if(!current)return res.status(404).json({mensaje:'Promoción no encontrada'})
  const promotion=normalizePromotion(req.body)
  if(!promotion)return res.status(400).json({mensaje:'Completa título, descripción, código y estado de la promoción.'})
  const promotions=await readCollection(collections.promotions)
  if(promotions.some(item=>item.id!==id&&item.codigo===promotion.codigo))return res.status(409).json({mensaje:'Ya existe una promoción con ese código.'})
  const item={id,...promotion}
  await save(collections.promotions,item)
  return res.json(item)
 } catch (error) { console.error('Error al actualizar promoción:',error); return res.status(500).json({mensaje:'No se pudo actualizar la promoción.'}) }
})

app.delete('/api/promociones/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.promotions,id)
  if(!current)return res.status(404).json({mensaje:'Promoción no encontrada'})
  await remove(collections.promotions,id)
  return res.json({mensaje:'Promoción eliminada',promocion:current})
 } catch (error) { console.error('Error al eliminar promoción:',error); return res.status(500).json({mensaje:'No se pudo eliminar la promoción.'}) }
})

const normalizeProduct = (input) => {
 if (!input || typeof input !== 'object' || Array.isArray(input)) return null
 const product = {
  nombre:typeof input.nombre==='string'?input.nombre.trim():'',
  marca:typeof input.marca==='string'?input.marca.trim():'',
  categoriaId:Number(input.categoriaId),
  precio:Number(input.precio),
  anterior:input.anterior==null||input.anterior===''?null:Number(input.anterior),
  stock:Number(input.stock),
  destacado:input.destacado,
  descripcion:typeof input.descripcion==='string'?input.descripcion.trim():'',
  especificaciones:Array.isArray(input.especificaciones)?input.especificaciones:[],
  imagen:typeof input.imagen==='string'?input.imagen.trim():''
 }
 const valid = product.nombre&&product.marca&&Number.isFinite(product.categoriaId)
  &&Number.isFinite(product.precio)&&product.precio>0
  &&(product.anterior===null||(Number.isFinite(product.anterior)&&product.anterior>0))
  &&Number.isInteger(product.stock)&&product.stock>=0&&typeof product.destacado==='boolean'
  &&product.descripcion&&product.imagen
  &&product.especificaciones.every(item=>typeof item==='string'&&item.trim())
 if (!valid) return null
 product.especificaciones=product.especificaciones.map(item=>item.trim())
 return product
}

app.get('/api/productos', async (req,res)=>{
 if(sendEditor(req,res))return
 try {
  const { buscar='', categoria='', destacados='', ordenar='' } = req.query
  let items=await readCollection(collections.products)
  items=items.filter(p=>`${p.nombre} ${p.marca}`.toLocaleLowerCase('es').includes(String(buscar).toLocaleLowerCase('es')))
  if (categoria) items=items.filter(p=>String(p.categoriaId)===String(categoria))
  if (destacados==='true') items=items.filter(p=>p.destacado)
  if (ordenar==='precio_asc') items.sort((a,b)=>a.precio-b.precio)
  if (ordenar==='precio_desc') items.sort((a,b)=>b.precio-a.precio)
  return res.json(items)
 } catch (error) { console.error('Error al obtener productos:',error); return res.status(500).json({mensaje:'No se pudieron obtener los productos.'}) }
})

app.post('/api/productos', async (req,res)=>{
 try {
  const product=normalizeProduct(req.body)
  if(!product)return res.status(400).json({mensaje:'Completa todos los campos del producto con valores válidos.'})
  if(!await getById(collections.categories,product.categoriaId))return res.status(400).json({mensaje:'La categoría del producto no existe.'})
  const item={id:await nextId(collections.products),...product}
  await save(collections.products,item)
  return res.status(201).json(item)
 } catch (error) { console.error('Error al crear producto:',error); return res.status(500).json({mensaje:'No se pudo crear el producto.'}) }
})

app.get('/api/productos/:id', async (req,res)=>{
 try {
  const item=await getById(collections.products,Number(req.params.id))
  return item ? res.json(item) : res.status(404).json({mensaje:'Producto no encontrado'})
 } catch (error) { console.error('Error al obtener producto:',error); return res.status(500).json({mensaje:'No se pudo obtener el producto.'}) }
})

app.put('/api/productos/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id)
  if(!await getById(collections.products,id))return res.status(404).json({mensaje:'Producto no encontrado'})
  const product=normalizeProduct(req.body)
  if(!product)return res.status(400).json({mensaje:'Completa todos los campos del producto con valores válidos.'})
  if(!await getById(collections.categories,product.categoriaId))return res.status(400).json({mensaje:'La categoría del producto no existe.'})
  const item={id,...product}
  await save(collections.products,item)
  return res.json(item)
 } catch (error) { console.error('Error al actualizar producto:',error); return res.status(500).json({mensaje:'No se pudo actualizar el producto.'}) }
})

app.delete('/api/productos/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.products,id)
  if(!current)return res.status(404).json({mensaje:'Producto no encontrado'})
  await remove(collections.products,id)
  return res.json({mensaje:'Producto eliminado',producto:current})
 } catch (error) { console.error('Error al eliminar producto:',error); return res.status(500).json({mensaje:'No se pudo eliminar el producto.'}) }
})

const normalizeClient = (input,existingEmail='') => {
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const nombre=typeof input.nombre==='string'?input.nombre.trim():''
 const email=typeof input.email==='string'&&input.email.trim()?input.email.trim().toLowerCase():existingEmail
 return nombre.length>=2&&/^\S+@\S+\.\S+$/.test(email)?{nombre,email}:null
}

app.get('/api/clientes', async (req,res)=>{
 if(sendEditor(req,res))return
 try {
  const clients=await readCollection(collections.clients)
  return res.json(clients.map(({id,nombre})=>({id,nombre})))
 } catch (error) { console.error('Error al obtener clientes:',error); return res.status(500).json({mensaje:'No se pudieron obtener los clientes.'}) }
})

app.post('/api/clientes', async (req,res)=>{
 try {
  const client=normalizeClient(req.body)
  if(!client)return res.status(400).json({mensaje:'Ingresa nombre y un correo válido.'})
  const clients=await readCollection(collections.clients)
  if(clients.some(item=>item.email===client.email))return res.status(409).json({mensaje:'Ya existe un cliente con ese correo.'})
  const item={id:await nextId(collections.clients),...client}
  await save(collections.clients,item)
  return res.status(201).json({id:item.id,nombre:item.nombre})
 } catch (error) { console.error('Error al crear cliente:',error); return res.status(500).json({mensaje:'No se pudo crear el cliente.'}) }
})

app.put('/api/clientes/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.clients,id)
  if(!current)return res.status(404).json({mensaje:'Cliente no encontrado'})
  const client=normalizeClient(req.body,current.email)
  if(!client)return res.status(400).json({mensaje:'Ingresa nombre y un correo válido.'})
  const clients=await readCollection(collections.clients)
  if(clients.some(item=>item.id!==id&&item.email===client.email))return res.status(409).json({mensaje:'Ya existe un cliente con ese correo.'})
  await save(collections.clients,{id,...client})
  return res.json({id,nombre:client.nombre})
 } catch (error) { console.error('Error al actualizar cliente:',error); return res.status(500).json({mensaje:'No se pudo actualizar el cliente.'}) }
})

app.delete('/api/clientes/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), current=await getById(collections.clients,id)
  if(!current)return res.status(404).json({mensaje:'Cliente no encontrado'})
  const orders=await readCollection(collections.orders)
  if(orders.some(order=>order.clienteId===id))return res.status(409).json({mensaje:'No puedes eliminar un cliente con pedidos registrados.'})
  await remove(collections.clients,id)
  return res.json({mensaje:'Cliente eliminado',cliente:{id:current.id,nombre:current.nombre}})
 } catch (error) { console.error('Error al eliminar cliente:',error); return res.status(500).json({mensaje:'No se pudo eliminar el cliente.'}) }
})

app.get('/api/pedidos', async (req,res)=>{
 if(sendEditor(req,res))return
 try {
  const orders=await readCollection(collections.orders)
  return res.json(orders.map(({id,fecha,total,estado,articulos})=>({id,fecha,total,estado,articulos})))
 } catch (error) { console.error('Error al obtener pedidos:',error); return res.status(500).json({mensaje:'No se pudieron obtener los pedidos.'}) }
})

app.post('/api/pedidos', async (req,res)=>{
 try {
  const { nombre, email, direccion, articulos }=req.body || {}
  if(typeof nombre!=='string'||nombre.trim().length<2||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof direccion!=='string'||direccion.trim().length<5||!Array.isArray(articulos)||!articulos.length) return res.status(400).json({mensaje:'Completa los datos y agrega al menos un producto.'})
  const products=await readCollection(collections.products)
  const lineas=[]
  for (const linea of articulos){
   const prod=products.find(p=>p.id===Number(linea.id))
   const cantidad=Number(linea.cantidad)
   if(!prod||!Number.isInteger(cantidad)||cantidad<1||cantidad>prod.stock) return res.status(400).json({mensaje:'Uno de los artículos es inválido o supera el stock.'})
   lineas.push({id:prod.id,nombre:prod.nombre,cantidad,precio:prod.precio})
  }
  const total=lineas.reduce((s,p)=>s+p.precio*p.cantidad,0)
  const normalizedEmail=email.trim().toLowerCase()
  const clients=await readCollection(collections.clients)
  let client=clients.find(c=>c.email===normalizedEmail)
  if(!client){
   client={id:await nextId(collections.clients),nombre:nombre.trim(),email:normalizedEmail}
   await save(collections.clients,client)
  }
  const order={id:await nextId(collections.orders,1000),clienteId:client.id,direccion:direccion.trim(),fecha:new Date().toISOString(),estado:'Recibido (demostración)',articulos:lineas,total}
  await save(collections.orders,order)
  return res.status(201).json({id:order.id,total:order.total,estado:order.estado})
 } catch (error) { console.error('Error al crear pedido:',error); return res.status(500).json({mensaje:'No se pudo crear el pedido.'}) }
})

const orderStates=new Set(['Recibido (demostración)','En preparación','Enviado','Cancelado'])

app.put('/api/pedidos/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), order=await getById(collections.orders,id)
  if(!order)return res.status(404).json({mensaje:'Pedido no encontrado'})
  if(!orderStates.has(req.body?.estado))return res.status(400).json({mensaje:'Selecciona un estado válido para el pedido.'})
  order.estado=req.body.estado
  await save(collections.orders,order)
  return res.json({id:order.id,fecha:order.fecha,total:order.total,estado:order.estado,articulos:order.articulos})
 } catch (error) { console.error('Error al actualizar pedido:',error); return res.status(500).json({mensaje:'No se pudo actualizar el pedido.'}) }
})

app.delete('/api/pedidos/:id', async (req,res)=>{
 try {
  const id=Number(req.params.id), order=await getById(collections.orders,id)
  if(!order)return res.status(404).json({mensaje:'Pedido no encontrado'})
  await remove(collections.orders,id)
  return res.json({mensaje:'Pedido eliminado',id:order.id})
 } catch (error) { console.error('Error al eliminar pedido:',error); return res.status(500).json({mensaje:'No se pudo eliminar el pedido.'}) }
})

const __dirname=path.dirname(fileURLToPath(import.meta.url))
const dist=path.resolve(__dirname,'../dist')
app.get('/admin/productos',(_req,res)=>res.sendFile(path.resolve(__dirname,'../api-resource-editor.html')))
app.use(express.static(dist))
app.get('*',(req,res)=>{
 if(req.path.startsWith('/api/')) return res.status(404).json({mensaje:'Ruta no encontrada'})
 return res.sendFile(path.join(dist,'index.html'),(error)=>{if(error&&!res.headersSent)res.status(404).send('Primero ejecuta npm run build')})
})

const port=Number(process.env.PORT)||3001
const publicUrl=process.env.RENDER_EXTERNAL_URL
const apiUrl=publicUrl ? `${publicUrl.replace(/\/$/,'')}/api` : `http://localhost:${port}/api`

initializeFirestore()
 .then(()=>app.listen(port,'0.0.0.0',()=>console.log(`TechStore API en ${apiUrl}`)))
 .catch(error=>{
  console.error('No se pudo inicializar Firestore:',error)
  process.exitCode=1
 })
