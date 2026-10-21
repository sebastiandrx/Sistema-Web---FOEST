const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
// Render entrega HTTPS a través de un proxy inverso.
app.set("trust proxy", 1);

const UNIVERSIDADES_PERMITIDAS = new Set(["UNIVERSIDAD LA GRAN COLOMBIA", "POLITÉCNICO GRANCOLOMBIANO", "ESCUELA DE ADMINISTRACIÓN DE NEGOCIOS - EAN", "ESCUELA COLOMBIANA DE INGENIERÍA JULIO GARAVITO", "UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA - UNAD", "UNIVERSIDAD SERGIO ARBOLEDA", "FUNDACIÓN DE EDUCACIÓN NUEVA AMÉRICA", "FUNDACIÓN UNIVERSITARIA COLOMBO GERMANA - UNIGERMANA", "INSTITUCIÓN UNIVERSITARIA COLEGIOS DE COLOMBIA - UNICOC", "CORPORACIÓN UNIVERSITARIA TALLER CINCO", "FUNDACIÓN UNIVERSITARIA LOS LIBERTADORES", "UNIVERSIDAD COOPERATIVA DE COLOMBIA", "FUNDACIÓN UNIVERSITARIA AGRARIA DE COLOMBIA", "CORPORACIÓN UNIFICADA NACIONAL DE EDUCACIÓN SUPERIOR - CUN", "UNIVERSIDAD ECCI", "UNIVERSIDAD DE LA SABANA", "UNIVERSIDAD DE CIENCIAS APLICADAS Y AMBIENTALES - UDCA", "CORPORACIÓN UNIVERSITARIA CENDA", "ESCUELA COLOMBIANA DE REHABILITACIÓN"]);

const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_KEY en el archivo .env");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UPLOAD_DIR = path.join(__dirname, "uploads_tmp");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "foest-documentos";

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function ensureStorageBucket() {
  const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (data) return true;
  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
  });
  if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
    console.error("No fue posible preparar el bucket de documentos:", createError.message);
    return false;
  }
  return true;
}

function limpiarNombreArchivo(nombre) {
  return String(nombre || "archivo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "archivo";
}

async function subirArchivoStorage(file, postulacionId) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const base = path.basename(file.originalname || "archivo", ext);
  const nombreSeguro = `${limpiarNombreArchivo(base)}-${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`;
  const storagePath = `${new Date().getFullYear()}/${postulacionId}/${file.fieldname}/${nombreSeguro}`;
  const contenido = fs.readFileSync(file.path);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, contenido, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false
    });

  try { fs.unlinkSync(file.path); } catch (_) {}
  if (error) throw new Error(`Error al subir ${file.originalname}: ${error.message}`);
  return storagePath;
}

async function obtenerUrlDocumento(storagePath) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Vistas principales
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public/estudiante/index.html")));
app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "public/estudiante/login.html")));
app.get("/admin", (_, res) => res.sendFile(path.join(__dirname, "public/admin/index.html")));

// ==========================================
// RUTAS DE ESTUDIANTES Y AUTENTICACIÓN
// ==========================================

// FASE 7.1 - SUPABASE AUTH POR ENLACES DE CORREO
function authClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
function baseUrl(req){ return `${req.protocol}://${req.get("host")}`; } // req.protocol respeta X-Forwarded-Proto del proxy confiable

app.post("/api/auth/registro", async (req,res)=>{
  try{
    const {documento,nombre,correo,password}=req.body;
    if(!documento||!nombre||!correo||!password) return res.status(400).json({error:"Todos los campos son obligatorios."});
    if(String(password).length<8) return res.status(400).json({error:"La contraseña debe tener mínimo 8 caracteres."});
    const doc=String(documento).trim(), mail=String(correo).trim().toLowerCase();
    const {data:existe}=await supabase.from("usuarios").select("id").eq("documento",doc).maybeSingle();
    if(existe) return res.status(400).json({error:"El documento ya se encuentra registrado."});
    const auth=authClient();
    const {data,error}=await auth.auth.signUp({
      email:mail,password,
      options:{emailRedirectTo:`${baseUrl(req)}/estudiante/login.html?confirmado=1`,
        data:{documento:doc,nombre:String(nombre).trim(),rol:"ESTUDIANTE"}}
    });
    if(error) throw error;
    // Creamos el perfil sin contraseña. Auth seguirá bloqueando el login hasta confirmar email.
    if(data.user){
      const {error:pError}=await supabase.from("usuarios").upsert({
        auth_user_id:data.user.id,documento:doc,nombre:String(nombre).trim(),
        correo:mail,rol:"ESTUDIANTE",password:null
      },{onConflict:"documento"});
      if(pError) throw pError;
    }
    res.status(201).json({ok:true,mensaje:"Cuenta creada. Revisa tu correo y abre el enlace de confirmación para activar tu cuenta."});
  }catch(e){
    console.error("Registro Auth:", {mensaje:e.message, codigo:e.code || e.status || "sin_codigo"});
    const detalle=String(e.message||"").toLowerCase();
    let mensaje="No fue posible crear la cuenta. Revisa los datos e inténtalo nuevamente.";
    if(/already registered|already exists|user already|duplicate|unique constraint/.test(detalle)){
      mensaje="Ya existe una cuenta asociada con ese correo o documento. Intenta iniciar sesión o recuperar la contraseña.";
    }else if(/rate limit|too many requests|email rate|over_email_send_rate_limit/.test(detalle)){
      mensaje="Se alcanzó el límite temporal de correos o solicitudes. Intenta nuevamente más tarde.";
    }else if(/invalid email|email address is invalid/.test(detalle)){
      mensaje="El correo electrónico no es válido. Revisa la dirección e inténtalo nuevamente.";
    }else if(/password/.test(detalle)){
      mensaje="La contraseña no cumple las reglas de seguridad configuradas en Supabase.";
    }
    res.status(400).json({error:mensaje});
  }
});

app.post("/api/auth/reenviar-confirmacion",async(req,res)=>{
  try{
    const correo=String(req.body.correo||"").trim().toLowerCase();
    const auth=authClient();
    const {error}=await auth.auth.resend({type:"signup",email:correo,options:{emailRedirectTo:`${baseUrl(req)}/estudiante/login.html?confirmado=1`}});
    if(error) throw error;
    res.json({ok:true,mensaje:"Si la cuenta está pendiente, se envió nuevamente el correo de confirmación."});
  }catch(e){res.status(429).json({error:"Espera un momento antes de solicitar otro correo."});}
});


const PERMISOS_FOEST = ["VER_DASHBOARD","VER_POSTULACIONES","REVISAR_DOCUMENTOS","SOLICITAR_SUBSANACION","APROBAR_POSTULACIONES","NO_APROBAR_POSTULACIONES","VER_ESTUDIANTES","VER_REPORTES","EXPORTAR_REPORTES","GESTIONAR_FUNCIONARIOS"];

async function autenticarFuncionario(req,res,next){
  try{
    const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    if(!token) return res.status(401).json({error:"Sesión administrativa requerida."});
    const {data:{user},error}=await supabase.auth.getUser(token);
    if(error||!user) return res.status(401).json({error:"La sesión administrativa venció. Inicia sesión nuevamente."});
    const {data:f,error:fErr}=await supabase.from("funcionarios_foest").select("*").eq("auth_user_id",user.id).maybeSingle();
    if(fErr||!f||!f.activo) return res.status(403).json({error:"Esta cuenta no tiene acceso activo al panel FOEST."});
    req.funcionario=f; req.authUser=user; next();
  }catch(e){res.status(401).json({error:"No fue posible validar la sesión."});}
}
function exigirPermiso(permiso){return (req,res,next)=>{
  const f=req.funcionario;
  if(f?.rol==="SUPERADMIN" || (Array.isArray(f?.permisos)&&f.permisos.includes(permiso))) return next();
  return res.status(403).json({error:"No tienes permiso para realizar esta acción."});
};}

app.post("/api/admin/login",async(req,res)=>{
  try{
    const {correo,password}=req.body; const auth=authClient();
    const {data,error}=await auth.auth.signInWithPassword({email:String(correo||"").trim().toLowerCase(),password:String(password||"")});
    if(error||!data.session) return res.status(401).json({error:"Correo o contraseña incorrectos."});
    const {data:f}=await supabase.from("funcionarios_foest").select("*").eq("auth_user_id",data.user.id).maybeSingle();
    if(!f||!f.activo) return res.status(403).json({error:"Tu cuenta no tiene acceso activo al panel FOEST."});
    res.json({ok:true,token:data.session.access_token,refreshToken:data.session.refresh_token,funcionario:f});
  }catch(e){res.status(401).json({error:"No fue posible iniciar sesión."});}
});
app.get("/api/admin/me",autenticarFuncionario,(req,res)=>res.json(req.funcionario));

app.get("/api/admin/funcionarios",autenticarFuncionario,exigirPermiso("GESTIONAR_FUNCIONARIOS"),async(req,res)=>{
  const {data,error}=await supabase.from("funcionarios_foest").select("id,auth_user_id,nombre,correo,cargo,rol,activo,permisos,created_at").order("created_at",{ascending:true});
  if(error)return res.status(400).json({error:error.message}); res.json(data||[]);
});
app.post("/api/admin/funcionarios",autenticarFuncionario,exigirPermiso("GESTIONAR_FUNCIONARIOS"),async(req,res)=>{
  try{
    const {nombre,correo,cargo,permisos=[]}=req.body;
    if(!nombre||!correo||!cargo)return res.status(400).json({error:"Nombre, correo y cargo son obligatorios."});
    const password="Foest!"+require("crypto").randomBytes(6).toString("base64url")+"9a";
    const {data:u,error:uErr}=await supabase.auth.admin.createUser({email:String(correo).trim().toLowerCase(),password,email_confirm:true,user_metadata:{nombre,rol:"FUNCIONARIO"}});
    if(uErr)throw uErr;
    const validos=[...new Set(permisos)].filter(x=>PERMISOS_FOEST.includes(x)&&x!=="GESTIONAR_FUNCIONARIOS");
    const {data:f,error:fErr}=await supabase.from("funcionarios_foest").insert([{auth_user_id:u.user.id,nombre:String(nombre).trim(),correo:String(correo).trim().toLowerCase(),cargo:String(cargo).trim(),rol:"FUNCIONARIO",activo:true,permisos:validos}]).select().single();
    if(fErr){await supabase.auth.admin.deleteUser(u.user.id);throw fErr;}
    res.status(201).json({ok:true,funcionario:f,passwordTemporal:password});
  }catch(e){res.status(400).json({error:e.message||"No fue posible crear el funcionario."});}
});
app.patch("/api/admin/funcionarios/:id",autenticarFuncionario,exigirPermiso("GESTIONAR_FUNCIONARIOS"),async(req,res)=>{
  const {nombre,cargo,activo,permisos}=req.body; const update={};
  if(nombre!==undefined)update.nombre=String(nombre).trim(); if(cargo!==undefined)update.cargo=String(cargo).trim(); if(activo!==undefined)update.activo=!!activo;
  if(Array.isArray(permisos))update.permisos=[...new Set(permisos)].filter(x=>PERMISOS_FOEST.includes(x)&&x!=="GESTIONAR_FUNCIONARIOS");
  const {data,error}=await supabase.from("funcionarios_foest").update(update).eq("id",req.params.id).eq("rol","FUNCIONARIO").select().single();
  if(error)return res.status(400).json({error:error.message}); res.json({ok:true,funcionario:data});
});
app.post("/api/admin/cambiar-password",autenticarFuncionario,async(req,res)=>{
  const p=String(req.body.password||""); if(p.length<8)return res.status(400).json({error:"La contraseña debe tener mínimo 8 caracteres."});
  const {error}=await supabase.auth.admin.updateUserById(req.authUser.id,{password:p}); if(error)return res.status(400).json({error:error.message}); res.json({ok:true});
});

app.post("/api/login",async(req,res)=>{
  const {usuario,documento,password}=req.body; const identificador=usuario||documento;
  try{
    const {data:perfil,error:pError}=await supabase.from("usuarios").select("id,auth_user_id,documento,nombre,correo,rol").eq("documento",String(identificador||"").trim()).single();
    if(pError||!perfil) return res.status(401).json({error:"Documento o contraseña incorrectos."});
    const auth=authClient();
    const {data,error}=await auth.auth.signInWithPassword({email:perfil.correo,password});
    if(error||!data.session) return res.status(401).json({error:"Documento o contraseña incorrectos, o correo pendiente de confirmación."});
    res.json({ok:true,token:data.session.access_token,refreshToken:data.session.refresh_token,usuario:perfil});
  }catch(e){res.status(401).json({error:"No fue posible iniciar sesión."});}
});

app.post("/api/auth/recuperar",async(req,res)=>{
  const correo=String(req.body.correo||"").trim().toLowerCase();
  if(!correo) return res.status(400).json({error:"Ingresa el correo registrado."});
  try{
    const auth=authClient();
    const {error}=await auth.auth.resetPasswordForEmail(correo,{redirectTo:`${baseUrl(req)}/estudiante/restablecer.html`});
    if(error) console.error("Recuperación Auth:", {mensaje:error.message,codigo:error.code || error.status});
  }catch(e){ console.error("Recuperación Auth:",e.message); }
  res.json({ok:true,mensaje:"Si el correo está registrado y el servicio de correo está disponible, recibirás un enlace para restablecer la contraseña."});
});

app.post("/api/auth/actualizar-password",async(req,res)=>{
  try{
    const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
    const nuevoPassword=String(req.body.nuevoPassword||"");
    if(!token||nuevoPassword.length<8) return res.status(400).json({error:"Enlace inválido o contraseña menor de 8 caracteres."});
    // Verifica el JWT de recuperación y actualiza al usuario autenticado.
    const {data:{user},error:gError}=await supabase.auth.getUser(token);
    if(gError||!user) return res.status(401).json({error:"El enlace de recuperación no es válido o venció."});
    const {error:uError}=await supabase.auth.admin.updateUserById(user.id,{password:nuevoPassword});
    if(uError) throw uError;
    res.json({ok:true});
  }catch(e){console.error("Actualizar password:",e.message);res.status(400).json({error:"No fue posible actualizar la contraseña."});}
});

// ==========================================
// RUTAS DE POSTULACIONES Y DOCUMENTOS
// ==========================================

app.get("/api/postulaciones", autenticarFuncionario, exigirPermiso("VER_POSTULACIONES"), async (_, res) => {
  const { data: postulaciones, error: errP } = await supabase.from("postulaciones").select("*");
  if (errP) return res.status(500).json({ error: errP.message });

  const { data: documentos, error: errD } = await supabase.from("documentos").select("*");
  if (errD) return res.status(500).json({ error: errD.message });

  const resultado = postulaciones.map(p => ({
    ...p,
    documentos: documentos.filter(d => d.postulacion_id === p.id)
  }));

  res.json(resultado);
});

app.get("/api/postulaciones/:id", autenticarFuncionario, exigirPermiso("VER_POSTULACIONES"), async (req, res) => {
  const pId = req.params.id;

  const { data: p, error: errP } = await supabase.from("postulaciones").select("*").eq("id", pId).single();
  if (errP || !p) return res.status(404).json({ error: "Postulación no encontrada" });

  const { data: documentos } = await supabase.from("documentos").select("*").eq("postulacion_id", pId);
  const { data: historial } = await supabase.from("historial").select("*").eq("postulacion_id", pId);

  res.json({
    ...p,
    documentos: documentos || [],
    historial: historial || []
  });
});


function camposDocumentalesRequeridos({ tipo, beneficios, lineaFormacion, condicionReintegro, nivelAcademico, formacionSeleccionada }) {
  const requeridos = [];

  const generales = {
    "PRIMERA VEZ": [
      "formulario_fisico", "formulario_virtual", "foto_3x4", "documento_identidad",
      "diploma_bachiller", "resultado_saber11", "sisben", "residencia", "matricula", "carta_pagare"
    ],
    "RENOVACIÓN": [
      "formulario_fisico", "formulario_virtual", "foto_3x4", "sisben", "matricula",
      "carta_pagare", "horas_sociales", "notas_originales"
    ],
    "REINTEGRO": [
      "formulario_fisico", "formulario_virtual", "foto_3x4", "sisben", "matricula",
      "carta_pagare", "horas_sociales", "notas_ultimo_periodo_foest"
    ]
  };

  requeridos.push(...(generales[tipo] || []));

  const especiales = {
    S11: ["s11_secretaria", "s11_institucion"],
    EA: ["excelencia_certificacion"],
    DEP: ["deportista_certificacion"],
    CUL: ["cultura_secretaria", "cultura_consejo"],
    SUP: ["superacion_certificacion"]
  };

  const apoyos = {
    ST: ["horario_clases"],
    AI: ["anteproyecto_investigacion"],
    AS: ["presupuesto_sostenimiento", "soportes_sostenimiento"],
    AM: ["presupuesto_movilidad", "soportes_movilidad"]
  };

  Object.keys(especiales).forEach(code => {
    if (beneficios.includes(code)) requeridos.push(...especiales[code]);
  });
  Object.keys(apoyos).forEach(code => {
    if (beneficios.includes(code)) requeridos.push(...apoyos[code]);
  });

  const requiereEscolaridad = Boolean(lineaFormacion) || beneficios.some(b => ["S11", "EA", "DEP", "CUL", "SUP"].includes(b));
  if (requiereEscolaridad) requeridos.push("certificado_escolaridad");

  if (tipo === "REINTEGRO") {
    if (condicionReintegro === "ACUERDO_12_2016") requeridos.push("sisben_transicion_12_2016");
    if (condicionReintegro === "ACUERDO_02_2023") requeridos.push("sisben_transicion_02_2023");
    if (condicionReintegro === "OTRA") {
      // No agrega documento de transición; queda registrado para revisión manual.
    }
    if (condicionReintegro === "CAMBIO_PROGRAMA_POSGRADO" && !requiereEscolaridad) {
      // Si el estudiante cambió de programa, la certificación de escolaridad es necesaria bajo la regla 023/2025.
      requeridos.push("certificado_escolaridad");
    }
    if (condicionReintegro === "CAMBIO_PROGRAMA_POSGRADO" && beneficios.includes("SUP")) {
      // La escolaridad ya está incluida por el incentivo especial.
    }
  }

  // Evitar duplicados manteniendo el orden de presentación.
  return [...new Set(requeridos)];
}

function archivosPorCampo(files) {
  const mapa = {};
  for (const file of files || []) {
    if (!mapa[file.fieldname]) mapa[file.fieldname] = [];
    mapa[file.fieldname].push(file);
  }
  return mapa;
}

app.post("/api/postulaciones", upload.any(), async (req, res) => {
  const body = req.body;
  const pId = "FOEST-" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  const radicado = "RAD-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000);

  let beneficios = [];
  try {
    beneficios = body.beneficios ? JSON.parse(body.beneficios) : [];
  } catch (_) {
    beneficios = Array.isArray(body.beneficios) ? body.beneficios : [body.beneficios].filter(Boolean);
  }

  const lineaFormacion = body.lineaFormacion || null;
  const condicionReintegro = body.condicionReintegro || null;
  const nivelAcademico = body.nivelAcademico || null;
  const formacionSeleccionada = body.formacionSeleccionada === "true";
  const archivos = archivosPorCampo(req.files || []);

  if (!["PRIMERA VEZ", "RENOVACIÓN", "REINTEGRO"].includes(body.tipoPostulacion)) {
    return res.status(400).json({ error: "Tipo de postulación inválido." });
  }
  if (!["PREGRADO", "POSGRADO"].includes(nivelAcademico)) {
    return res.status(400).json({ error: "Debe indicar si la solicitud corresponde a pregrado o posgrado." });
  }
  if (formacionSeleccionada && !lineaFormacion) {
    return res.status(400).json({ error: "Debe seleccionar una línea estratégica de formación." });
  }
  if (lineaFormacion === "LINEA_5" && nivelAcademico === "POSGRADO") {
    return res.status(400).json({ error: "La Línea Estratégica No. 5 - Igualdad Asertiva aplica únicamente para solicitudes de pregrado." });
  }
  if (body.tipoPostulacion === "REINTEGRO" && !condicionReintegro) {
    return res.status(400).json({ error: "Debe indicar la condición correspondiente al reintegro." });
  }

  const requeridos = camposDocumentalesRequeridos({
    tipo: body.tipoPostulacion,
    beneficios,
    lineaFormacion,
    condicionReintegro,
    nivelAcademico,
    formacionSeleccionada
  });
  const faltantes = requeridos.filter(campo => !archivos[campo] || archivos[campo].length === 0);
  if (faltantes.length) {
    return res.status(400).json({
      error: "Faltan documentos obligatorios.",
      campos: faltantes
    });
  }

  const { error: errP } = await supabase.from("postulaciones").insert([{
    id: pId,
    radicado,
    tipo_postulacion: body.tipoPostulacion || "PRIMERA VEZ",
    nombre: body.nombre || "",
    documento: body.documento || "",
    correo: body.correo || "",
    telefono: body.telefono || "",
    direccion: body.direccion || "",
    universidad: body.universidad || "",
    carrera: body.carrera || "",
    semestre: body.semestre || "",
    nivel_academico: nivelAcademico,
    beneficios,
    linea_formacion: lineaFormacion,
    condicion_reintegro: condicionReintegro,
    estado: "PENDIENTE",
    observacion: ""
  }]);

  if (errP) return res.status(400).json({ error: errP.message });

  const files = req.files || [];
  const nombresLegibles = {
    formulario_fisico: "Formulario de solicitud de beneficios FOEST físico",
    formulario_virtual: "Pantallazo firmado del Formulario de inscripción FOEST virtual",
    foto_3x4: "Fotografía 3x4",
    documento_identidad: "Documento de identidad ampliado al 150%",
    documento_identidad_actualizado: "Documento de identidad actualizado ampliado al 150%",
    diploma_bachiller: "Diploma de bachiller",
    resultado_saber11: "Resultado pruebas ICFES - Saber 11",
    certificado_escolaridad: "Certificación de escolaridad",
    certificado_escolaridad_linea: "Certificación de escolaridad según línea seleccionada",
    certificado_escolaridad_reintegro: "Certificación de escolaridad para reintegro",
    sisben: "Soporte de Sisbén",
    sisben_transicion_12_2016: "Soporte de antigüedad Sisbén - Acuerdo 12 de 2016",
    sisben_transicion_02_2023: "Soporte de antigüedad Sisbén - Acuerdo 02 de 2023",
    residencia: "Certificado de residencia",
    matricula: "Recibo de pago y/o certificación de matrícula",
    carta_pagare: "Carta de instrucciones y pagaré firmado",
    horas_sociales: "Certificado de horas sociales",
    notas_originales: "Certificado de notas original",
    notas_ultimo_periodo_foest: "Certificado de notas del último periodo con apoyos FOEST",
    notas_ultimo_periodo_cursado: "Certificado de notas del último periodo cursado",
    horario_clases: "Horario detallado de clases",
    s11_secretaria: "Certificación Secretaría de Educación - mejor puntaje S11",
    s11_institucion: "Certificación institución educativa - mejor puntaje S11",
    excelencia_certificacion: "Certificación de excelencia académica",
    deportista_certificacion: "Certificación IMRDT - mejor deportista",
    cultura_secretaria: "Certificación Secretaría de Cultura y Patrimonio",
    cultura_consejo: "Certificación Consejo Municipal de Cultura",
    superacion_certificacion: "Certificación de Superación",
    anteproyecto_investigacion: "Anteproyecto de investigación",
    presupuesto_sostenimiento: "Presupuesto de gastos de sostenimiento",
    soportes_sostenimiento: "Soportes de gastos de sostenimiento",
    presupuesto_movilidad: "Presupuesto de gastos de movilidad y 3 cotizaciones",
    soportes_movilidad: "Soportes de gastos de movilidad"
  };

  const archivosSubidos = [];
  try {
    for (const file of files) {
      const storagePath = await subirArchivoStorage(file, pId);
      archivosSubidos.push(storagePath);
      const { error: errDoc } = await supabase.from("documentos").insert([{
        id: "DOC-" + Date.now() + Math.floor(Math.random() * 90 + 10),
        postulacion_id: pId,
        nombre: nombresLegibles[file.fieldname] || file.originalname,
        archivo_url: storagePath,
        tipo: file.fieldname,
        estado: "PENDIENTE",
        observacion: ""
      }]);
      if (errDoc) throw new Error(errDoc.message);
    }
  } catch (storageError) {
    for (const storagePath of archivosSubidos) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }
    await supabase.from("documentos").delete().eq("postulacion_id", pId);
    await supabase.from("postulaciones").delete().eq("id", pId);
    return res.status(400).json({ error: storageError.message });
  }

  await supabase.from("historial").insert([{
    id: "H-" + Date.now(),
    postulacion_id: pId,
    accion: "RADICACIÓN",
    detalle: `Postulación recibida. Línea: ${lineaFormacion || "No aplica"}. Condición de reintegro: ${condicionReintegro || "No aplica"}.`
  }]);

  res.status(201).json({ ok: true, postulacion: { id: pId, radicado, linea_formacion: lineaFormacion, nivel_academico: nivelAcademico } });
});

app.patch("/api/documentos/:id", autenticarFuncionario, exigirPermiso("REVISAR_DOCUMENTOS"), async (req, res) => {
  const docId = req.params.id;
  const { estado, observacion } = req.body;

  if (!["APROBADO", "INCONSISTENTE", "PENDIENTE"].includes(estado)) {
    return res.status(400).json({ error: "Estado documental inválido." });
  }
  if (estado === "INCONSISTENTE" && !String(observacion || "").trim()) {
    return res.status(400).json({ error: "Debe registrar una observación cuando el documento requiere corrección." });
  }

  const ahora = new Date();
  const updateDoc = {
    estado,
    observacion: String(observacion || "").trim(),
    revisado_por: req.funcionario.nombre,
    revisado_en: ahora.toISOString(),
    subsanacion_solicitada_en: estado === "INCONSISTENTE" ? ahora.toISOString() : null,
    subsanacion_vence_en: estado === "INCONSISTENTE" ? new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString() : null
  };

  const { data: doc, error } = await supabase
    .from("documentos")
    .update(updateDoc)
    .eq("id", docId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabase.from("historial").insert([{
    id: "H-" + Date.now() + Math.floor(Math.random() * 1000),
    postulacion_id: doc.postulacion_id,
    accion: "REVISIÓN DOCUMENTAL",
    detalle: `${doc.nombre}: ${estado}${doc.observacion ? " - " + doc.observacion : ""}. Revisor: ${updateDoc.revisado_por}`
  }]);

  // Una inconsistencia abre automáticamente una ventana de subsanación de 24 horas.
  const { data: postulacion } = await supabase.from("postulaciones").select("estado").eq("id", doc.postulacion_id).single();
  if (estado === "INCONSISTENTE") {
    await supabase.from("postulaciones").update({
      estado: "SUBSANACIÓN",
      observacion: `Subsanación documental requerida: ${doc.nombre}. ${doc.observacion || ""}`.trim(),
      revisado_por: updateDoc.revisado_por,
      revisado_en: ahora.toISOString()
    }).eq("id", doc.postulacion_id);
  } else if (postulacion && postulacion.estado === "PENDIENTE") {
    await supabase.from("postulaciones").update({ estado: "EN REVISIÓN" }).eq("id", doc.postulacion_id);
  }

  res.json({ ok: true, documento: doc });
});

// El estudiante solo puede reemplazar el documento señalado y únicamente dentro de las 24 horas.
app.post("/api/estudiante/documentos/:id/subsanar", upload.single("archivo"), async (req, res) => {
  const docId = req.params.id;
  const identidad = String(req.body.documento || "").trim();
  const file = req.file;
  const limpiar = () => { if (file?.path) { try { fs.unlinkSync(file.path); } catch (_) {} } };

  if (!file) return res.status(400).json({ error: "Debe seleccionar el archivo corregido." });
  if (!identidad) { limpiar(); return res.status(400).json({ error: "No fue posible validar al estudiante." }); }

  const { data: doc, error: errDoc } = await supabase.from("documentos").select("*").eq("id", docId).single();
  if (errDoc || !doc) { limpiar(); return res.status(404).json({ error: "Documento no encontrado." }); }

  const { data: p } = await supabase.from("postulaciones").select("id, documento").eq("id", doc.postulacion_id).single();
  if (!p || String(p.documento) !== identidad) {
    limpiar(); return res.status(403).json({ error: "No tiene autorización para modificar este documento." });
  }
  if (doc.estado !== "INCONSISTENTE" || !doc.subsanacion_vence_en) {
    limpiar(); return res.status(409).json({ error: "Este documento no está habilitado para subsanación." });
  }
  const vence = new Date(doc.subsanacion_vence_en);
  if (!Number.isFinite(vence.getTime()) || Date.now() > vence.getTime()) {
    limpiar(); return res.status(410).json({ error: "El plazo de 24 horas para subsanar este documento ya venció." });
  }

  try {
    await supabase.from("documento_versiones").insert([{
      documento_id: doc.id, postulacion_id: doc.postulacion_id, archivo_url: doc.archivo_url,
      nombre: doc.nombre, tipo: doc.tipo, motivo: doc.observacion || "Documento reemplazado por subsanación"
    }]);

    file.fieldname = doc.tipo || "subsanacion";
    const storagePath = await subirArchivoStorage(file, doc.postulacion_id);
    const ahoraSubsanacion = new Date().toISOString();

    const { data: actualizado, error: errUpdate } = await supabase.from("documentos").update({
      archivo_url: storagePath,
      estado: "PENDIENTE",
      observacion: "Documento reemplazado por el estudiante. Pendiente de nueva revisión.",
      revisado_por: null, revisado_en: null, subsanado_en: ahoraSubsanacion
    }).eq("id", doc.id).select().single();
    if (errUpdate) throw errUpdate;

    await supabase.from("postulaciones").update({
      estado: "EN REVISIÓN",
      observacion: "Documento subsanado dentro del plazo. Pendiente de nueva revisión."
    }).eq("id", doc.postulacion_id);

    await supabase.from("historial").insert([{
      id: "H-" + Date.now() + Math.floor(Math.random() * 1000),
      postulacion_id: doc.postulacion_id,
      accion: "SUBSANACIÓN DOCUMENTAL",
      detalle: `${doc.nombre}: el estudiante cargó una nueva versión dentro del plazo de 24 horas.`
    }]);

    res.json({ ok: true, documento: actualizado });
  } catch (error) {
    limpiar();
    res.status(400).json({ error: error.message || "No fue posible reemplazar el documento." });
  }
});

app.patch("/api/postulaciones/:id", autenticarFuncionario, async (req, res) => {
  const pId = req.params.id;
  const { estado, observacion, valor_beneficio } = req.body;
  const estadosValidos = ["PENDIENTE", "EN REVISIÓN", "SUBSANACIÓN", "APROBADO", "NO APROBADO"];
  if (estado === "APROBADO" && req.funcionario.rol !== "SUPERADMIN" && !(req.funcionario.permisos||[]).includes("APROBAR_POSTULACIONES")) return res.status(403).json({error:"No tienes permiso para aprobar postulaciones."});
  if (estado === "NO APROBADO" && req.funcionario.rol !== "SUPERADMIN" && !(req.funcionario.permisos||[]).includes("NO_APROBAR_POSTULACIONES")) return res.status(403).json({error:"No tienes permiso para no aprobar postulaciones."});
  if (estado === "SUBSANACIÓN" && req.funcionario.rol !== "SUPERADMIN" && !(req.funcionario.permisos||[]).includes("SOLICITAR_SUBSANACION")) return res.status(403).json({error:"No tienes permiso para solicitar subsanaciones."});

  if (estado && !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: "Estado de postulación inválido." });
  }

  if (estado === "APROBADO") {
    const { data: docs, error: errDocs } = await supabase
      .from("documentos")
      .select("id, nombre, estado")
      .eq("postulacion_id", pId);
    if (errDocs) return res.status(400).json({ error: errDocs.message });
    const pendientes = (docs || []).filter(d => d.estado !== "APROBADO");
    if (pendientes.length) {
      return res.status(409).json({
        error: "No se puede aprobar la postulación mientras existan documentos pendientes o con inconsistencias.",
        documentos_pendientes: pendientes.map(d => ({ id: d.id, nombre: d.nombre, estado: d.estado }))
      });
    }
  }

  if (["SUBSANACIÓN", "NO APROBADO"].includes(estado) && !String(observacion || "").trim()) {
    return res.status(400).json({ error: "Debe registrar una observación para este cambio de estado." });
  }

  const updateData = {};
  if (estado) updateData.estado = estado;
  if (observacion !== undefined) updateData.observacion = String(observacion || "").trim();
  if (valor_beneficio !== undefined) updateData.valor_beneficio = valor_beneficio === "" ? null : valor_beneficio;
  if (estado) {
    updateData.revisado_por = req.funcionario.nombre;
    updateData.revisado_en = new Date().toISOString();
  }

  const { data: p, error } = await supabase
    .from("postulaciones")
    .update(updateData)
    .eq("id", pId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabase.from("historial").insert([{
    id: "H-" + Date.now() + Math.floor(Math.random() * 1000),
    postulacion_id: pId,
    accion: estado ? "CAMBIO DE ESTADO" : "ACTUALIZACIÓN DE BENEFICIO",
    detalle: `${estado ? `Estado: ${p.estado}` : "Valor actualizado"}${p.observacion ? ` | Observación: ${p.observacion}` : ""} | Valor asignado: ${p.valor_beneficio || "No definido"}`
  }]);

  res.json({ ok: true, postulacion: p });
});


// ==========================================
// RUTAS COMPLEMENTARIAS
// ==========================================

app.get("/api/estadisticas", autenticarFuncionario, exigirPermiso("VER_DASHBOARD"), async (_, res) => {
  const { data, error } = await supabase.from("postulaciones").select("estado, beneficios, tipo_postulacion");
  if (error) return res.status(500).json({ error: error.message });

  const estados = { pendiente: 0, enRevision: 0, subsanacion: 0, aprobadas: 0, noAprobadas: 0 };
  const tipos = { "PRIMERA VEZ": 0, "RENOVACIÓN": 0, "REINTEGRO": 0 };
  const beneficios = {};
  (data || []).forEach(p => {
    if (p.estado === "PENDIENTE") estados.pendiente++;
    if (p.estado === "EN REVISIÓN") estados.enRevision++;
    if (p.estado === "SUBSANACIÓN") estados.subsanacion++;
    if (p.estado === "APROBADO") estados.aprobadas++;
    if (p.estado === "NO APROBADO") estados.noAprobadas++;
    if (tipos[p.tipo_postulacion] !== undefined) tipos[p.tipo_postulacion]++;
    (Array.isArray(p.beneficios) ? p.beneficios : []).forEach(b => beneficios[b] = (beneficios[b] || 0) + 1);
  });
  res.json({ total: (data || []).length, pendientes: estados.pendiente + estados.enRevision, ...estados, tipos, beneficios });
});

app.get("/api/documentos/:id/url", autenticarFuncionario, exigirPermiso("REVISAR_DOCUMENTOS"), async (req, res) => {
  const { data: doc, error: docError } = await supabase
    .from("documentos")
    .select("id, archivo_url, nombre, tipo")
    .eq("id", req.params.id)
    .single();

  if (docError || !doc || !doc.archivo_url) {
    return res.status(404).json({ error: "Documento no encontrado." });
  }

  try {
    const url = await obtenerUrlDocumento(doc.archivo_url);
    res.json({ ok: true, url, nombre: doc.nombre, tipo: doc.tipo });
  } catch (error) {
    res.status(500).json({ error: "No fue posible generar el enlace seguro del documento." });
  }
});

app.get("/api/estudiante/postulaciones", async (req, res) => {
  const { documento } = req.query;
  if (!documento) return res.status(400).json({ error: "Documento requerido" });

  const { data, error } = await supabase
    .from("postulaciones")
    .select("*")
    .eq("documento", documento)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const ids = (data || []).map(p => p.id);
  let documentos = [];
  if (ids.length) {
    const { data: docs, error: errDocs } = await supabase.from("documentos").select("*").in("postulacion_id", ids);
    if (errDocs) return res.status(500).json({ error: errDocs.message });
    documentos = docs || [];
  }
  res.json((data || []).map(p => ({ ...p, documentos: documentos.filter(d => d.postulacion_id === p.id) })));
});

app.get("/api/admin/estudiantes", autenticarFuncionario, exigirPermiso("VER_ESTUDIANTES"), async (_, res) => {
  const { data, error } = await supabase
    .from("postulaciones")
    .select("documento, nombre, universidad, carrera");

  if (error) return res.status(500).json({ error: error.message });

  const map = {};
  (data || []).forEach(p => {
    if (!map[p.documento]) {
      map[p.documento] = {
        documento: p.documento,
        nombre: p.nombre,
        universidades: new Set(),
        postulaciones: 0
      };
    }
    if (p.universidad) map[p.documento].universidades.add(p.universidad);
    map[p.documento].postulaciones++;
  });

  res.json(Object.values(map).map(x => ({
    ...x,
    universidades: [...x.universidades]
  })));
});

app.get("/api/admin/reportes", autenticarFuncionario, exigirPermiso("VER_REPORTES"), async (_, res) => {
  const { data, error } = await supabase
    .from("postulaciones")
    .select("beneficios, universidad");

  if (error) return res.status(500).json({ error: error.message });

  const beneficios = {};
  const universidades = {};

  (data || []).forEach(p => {
    if (Array.isArray(p.beneficios)) {
      p.beneficios.forEach(b => {
        beneficios[b] = (beneficios[b] || 0) + 1;
      });
    }
    if (p.universidad) {
      universidades[p.universidad] = (universidades[p.universidad] || 0) + 1;
    }
  });

  res.json({ beneficios, universidades });
});


// ==========================================
// EXPORTACIÓN EXCEL NORMALIZADA - FASE 6.4
// ==========================================
app.get("/api/admin/exportar-excel", autenticarFuncionario, exigirPermiso("EXPORTAR_REPORTES"), async (_, res) => {
  try {
    const [
      { data: postulaciones, error: errP },
      { data: documentos, error: errD },
      { data: historial, error: errH }
    ] = await Promise.all([
      supabase.from("postulaciones").select("*").order("created_at", { ascending: true }),
      supabase.from("documentos").select("*"),
      supabase.from("historial").select("*")
    ]);

    if (errP) throw errP;
    if (errD) throw errD;
    if (errH) throw errH;

    const ps = postulaciones || [];
    const ds = documentos || [];
    const hs = historial || [];

    const beneficioNombre = {
      S11: "Mejores puntajes ICFES - Saber 11",
      EA: "Excelencia Académica",
      DEP: "Mejor Deportista",
      CUL: "Cultura",
      SUP: "Superación",
      ST: "Subsidio de Transporte",
      AS: "Apoyo de Sostenimiento",
      AM: "Apoyo a la Movilidad Nacional e Internacional",
      AI: "Apoyo a la Investigación"
    };
    const lineaNombre = {
      LINEA_1: "Línea Estratégica No. 1 - Auxilio 100% por convenio",
      LINEA_2: "Línea Estratégica No. 2 - Pacto entre tres",
      LINEA_3: "Línea Estratégica No. 3 - Pacto entre cuatro",
      LINEA_4: "Línea Estratégica No. 4 - Pacto especial",
      LINEA_5: "Línea Estratégica No. 5 - Igualdad Asertiva",
      LINEA_6: "Línea Estratégica No. 6 - Posgrados"
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema FOEST";
    workbook.created = new Date();

    const estiloHoja = (ws) => {
      ws.views = [{ state: "frozen", ySplit: 1 }];
      ws.autoFilter = { from: "A1", to: ws.getRow(1).getCell(ws.columnCount).address };
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D3B66" } };
      header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      header.height = 30;
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
      });
      ws.columns.forEach(col => {
        let max = String(col.header || "").length;
        col.eachCell({ includeEmpty: false }, cell => { max = Math.max(max, String(cell.value ?? "").length); });
        col.width = Math.min(Math.max(max + 2, 12), 38);
      });
    };
    const fechaExcel = v => v ? new Date(v) : null;

    // Hoja principal: una fila por postulación.
    const wp = workbook.addWorksheet("Postulaciones");
    wp.columns = [
      ["ID_POSTULACION","id"],["RADICADO","radicado"],["FECHA_RADICACION","created_at"],
      ["TIPO_POSTULACION","tipo_postulacion"],["ESTADO_POSTULACION","estado"],
      ["NOMBRE_COMPLETO","nombre"],["NUMERO_DOCUMENTO","documento"],["CORREO","correo"],
      ["TELEFONO","telefono"],["DIRECCION","direccion"],["NIVEL_ACADEMICO","nivel_academico"],
      ["UNIVERSIDAD","universidad"],["PROGRAMA_ACADEMICO","carrera"],["SEMESTRE","semestre"],
      ["LINEA_FORMACION","linea_formacion_nombre"],["CONDICION_REINTEGRO","condicion_reintegro"],
      ["BENEFICIOS","beneficios_texto"],["VALOR_BENEFICIO","valor_beneficio"],
      ["OBSERVACION_GENERAL","observacion"],["REVISADO_POR","revisado_por"],["FECHA_REVISION","revisado_en"]
    ].map(([header,key])=>({header,key}));
    ps.forEach(p => wp.addRow({
      ...p,
      created_at: fechaExcel(p.created_at),
      revisado_en: fechaExcel(p.revisado_en),
      linea_formacion_nombre: lineaNombre[p.linea_formacion] || p.linea_formacion || "",
      beneficios_texto: (Array.isArray(p.beneficios)?p.beneficios:[]).map(b=>beneficioNombre[b]||b).join(" | ")
    }));
    wp.getColumn("created_at").numFmt="yyyy-mm-dd hh:mm";
    wp.getColumn("revisado_en").numFmt="yyyy-mm-dd hh:mm";
    wp.getColumn("valor_beneficio").numFmt='"$"#,##0';
    estiloHoja(wp);

    // Hoja normalizada: una fila por beneficio.
    const wb = workbook.addWorksheet("Beneficios");
    wb.columns = [
      ["ID_POSTULACION","id"],["RADICADO","radicado"],["NUMERO_DOCUMENTO","documento"],
      ["NOMBRE_COMPLETO","nombre"],["CODIGO_BENEFICIO","codigo"],["BENEFICIO","beneficio"],
      ["LINEA_FORMACION","linea"],["ESTADO_POSTULACION","estado"]
    ].map(([header,key])=>({header,key}));
    ps.forEach(p => {
      if (p.linea_formacion) wb.addRow({id:p.id,radicado:p.radicado,documento:p.documento,nombre:p.nombre,codigo:p.linea_formacion,beneficio:"INCENTIVO A LA FORMACIÓN",linea:lineaNombre[p.linea_formacion]||p.linea_formacion,estado:p.estado});
      (Array.isArray(p.beneficios)?p.beneficios:[]).forEach(b => wb.addRow({id:p.id,radicado:p.radicado,documento:p.documento,nombre:p.nombre,codigo:b,beneficio:beneficioNombre[b]||b,linea:lineaNombre[p.linea_formacion]||"",estado:p.estado}));
    });
    estiloHoja(wb);

    const pMap = Object.fromEntries(ps.map(p=>[p.id,p]));
    const wd = workbook.addWorksheet("Documentos");
    wd.columns = [
      ["ID_DOCUMENTO","id"],["ID_POSTULACION","postulacion_id"],["RADICADO","radicado"],
      ["NUMERO_DOCUMENTO_ESTUDIANTE","documento_estudiante"],["NOMBRE_ESTUDIANTE","nombre_estudiante"],
      ["TIPO_DOCUMENTO","tipo"],["NOMBRE_DOCUMENTO","nombre"],["ESTADO_DOCUMENTO","estado"],
      ["OBSERVACION","observacion"],["REVISADO_POR","revisado_por"],["FECHA_REVISION","revisado_en"],
      ["SUBSANACION_SOLICITADA","subsanacion_solicitada_en"],["SUBSANACION_VENCE","subsanacion_vence_en"],
      ["SUBSANADO_EN","subsanado_en"],["RUTA_STORAGE","archivo_url"]
    ].map(([header,key])=>({header,key}));
    ds.forEach(d => {
      const p=pMap[d.postulacion_id]||{};
      wd.addRow({...d,radicado:p.radicado||"",documento_estudiante:p.documento||"",nombre_estudiante:p.nombre||"",
        revisado_en:fechaExcel(d.revisado_en),subsanacion_solicitada_en:fechaExcel(d.subsanacion_solicitada_en),
        subsanacion_vence_en:fechaExcel(d.subsanacion_vence_en),subsanado_en:fechaExcel(d.subsanado_en)});
    });
    ["revisado_en","subsanacion_solicitada_en","subsanacion_vence_en","subsanado_en"].forEach(c=>wd.getColumn(c).numFmt="yyyy-mm-dd hh:mm");
    estiloHoja(wd);

    const wh = workbook.addWorksheet("Historial");
    wh.columns = [
      ["ID","id"],["ID_POSTULACION","postulacion_id"],["RADICADO","radicado"],
      ["NUMERO_DOCUMENTO","documento"],["NOMBRE_ESTUDIANTE","nombre"],["ACCION","accion"],
      ["DETALLE","detalle"],["FECHA","created_at"]
    ].map(([header,key])=>({header,key}));
    hs.forEach(h => {
      const p=pMap[h.postulacion_id]||{};
      wh.addRow({...h,radicado:p.radicado||"",documento:p.documento||"",nombre:p.nombre||"",created_at:fechaExcel(h.created_at)});
    });
    wh.getColumn("created_at").numFmt="yyyy-mm-dd hh:mm";
    estiloHoja(wh);

    // Resumen administrativo.
    const wr = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: "FF0D3B66" } } });
    wr.addRow(["REPORTE GENERAL FOEST"]);
    wr.mergeCells("A1:D1");
    wr.getCell("A1").font={bold:true,size:16,color:{argb:"FFFFFFFF"}};
    wr.getCell("A1").fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D3B66"}};
    wr.getCell("A1").alignment={horizontal:"center"};
    wr.addRow(["Generado",new Date()]);
    wr.getCell("B2").numFmt="yyyy-mm-dd hh:mm";
    wr.addRow([]);
    wr.addRow(["INDICADOR","CANTIDAD"]);
    const estados={}; const tipos={}; const universidades={};
    ps.forEach(p=>{estados[p.estado||"SIN ESTADO"]=(estados[p.estado||"SIN ESTADO"]||0)+1;tipos[p.tipo_postulacion||"SIN TIPO"]=(tipos[p.tipo_postulacion||"SIN TIPO"]||0)+1;if(p.universidad)universidades[p.universidad]=(universidades[p.universidad]||0)+1;});
    wr.addRow(["Total postulaciones",ps.length]);
    wr.addRow(["Total documentos",ds.length]);
    wr.addRow(["Total movimientos de historial",hs.length]);
    Object.entries(estados).sort().forEach(([k,v])=>wr.addRow(["Estado: "+k,v]));
    Object.entries(tipos).sort().forEach(([k,v])=>wr.addRow(["Tipo: "+k,v]));
    wr.addRow([]); wr.addRow(["UNIVERSIDAD","POSTULACIONES"]);
    Object.entries(universidades).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>wr.addRow([k,v]));
    wr.getRow(4).font={bold:true,color:{argb:"FFFFFFFF"}};wr.getRow(4).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D3B66"}};
    const uHeader=wr.getRow(8+Object.keys(estados).length+Object.keys(tipos).length);
    uHeader.font={bold:true,color:{argb:"FFFFFFFF"}};uHeader.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D3B66"}};
    wr.columns=[{width:55},{width:20},{width:15},{width:15}];

    const buffer = await workbook.xlsx.writeBuffer();
    const fecha = new Date().toISOString().slice(0,10);
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",`attachment; filename="FOEST_Reporte_${fecha}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error exportando Excel:", error);
    res.status(500).json({ error: "No fue posible generar el Excel: " + (error.message || "Error desconocido") });
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  const storageReady = await ensureStorageBucket();
  console.log(`Almacenamiento de documentos: ${storageReady ? STORAGE_BUCKET : "NO DISPONIBLE"}`);
  console.log(`FOEST conectado a Supabase en http://localhost:${PORT}`);
  console.log(`Portal estudiante: http://localhost:${PORT}/`);
  console.log(`Panel admin:       http://localhost:${PORT}/admin`);
});

