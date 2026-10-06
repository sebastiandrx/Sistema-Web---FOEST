let funcionarioSesion=null;
let postulaciones = [];
let listaEstudiantesGlobal = [];
let chartBeneficiosInstance = null;
let chartUniversidadesInstance = null;

const BENEFICIOS = {
  S11: "Mejores puntajes Saber 11", EA: "Excelencia académica", DEP: "Mejor deportista",
  CUL: "Cultura", SUP: "Superación", ST: "Subsidio de transporte",
  AS: "Apoyo de sostenimiento", AM: "Movilidad nacional/internacional", AI: "Investigación"
};
const LINEAS = {
  LINEA_1: "Línea 1 - Auxilio 100% por convenio", LINEA_2: "Línea 2 - Pacto entre tres",
  LINEA_3: "Línea 3 - Pacto entre cuatro", LINEA_4: "Línea 4 - Pacto especial",
  LINEA_5: "Línea 5 - Igualdad Asertiva", LINEA_6: "Línea 6 - Posgrados"
};
const CONDICIONES = {
  ACUERDO_12_2016: "Acuerdo 12 de 2016", ACUERDO_02_2023: "Acuerdo 02 de 2023",
  CAMBIO_PROGRAMA_POSGRADO: "Cambio de programa / pregrado a posgrado", OTRA: "Otra condición"
};

const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const tipoDe = p => p.tipo_postulacion || p.tipoPostulacion || "—";
const fecha = v => v ? new Date(v).toLocaleString("es-CO") : "—";
const beneficiosTexto = p => {
  const arr = Array.isArray(p.beneficios) ? p.beneficios : [];
  const nombres = arr.map(x => BENEFICIOS[x] || x);
  if (p.linea_formacion) nombres.unshift(LINEAS[p.linea_formacion] || p.linea_formacion);
  return nombres.length ? nombres.join(", ") : "No registrados";
};

function badge(estado) {
  const mapa = {"APROBADO":"ok","INCONSISTENTE":"bad","NO APROBADO":"bad","PENDIENTE":"warn","EN REVISIÓN":"info","SUBSANACIÓN":"orange"};
  return `<span class="badge ${mapa[estado] || ''}">${esc(estado || "PENDIENTE")}</span>`;
}

function mensaje(texto, tipo="ok") {
  const box = document.getElementById("adminMessage");
  if (!box) return alert(texto);
  box.className = `admin-message ${tipo}`;
  box.textContent = texto;
  box.style.display = "block";
  setTimeout(() => box.style.display = "none", 5000);
}

async function api(url, options={}) {
  options.headers = {...(options.headers||{})};
  const token=localStorage.getItem("adminToken"); if(token) options.headers.Authorization="Bearer "+token;
  const r = await fetch(url, options);
  let data = {};
  try { data = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(data.error || "Ocurrió un error en la solicitud.");
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("nav a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); navegar(a.getAttribute("href"));
  }));
  if (localStorage.getItem("adminToken")) mostrarDashboard();
});

async function iniciarSesion(e) {
  e.preventDefault(); const errorEl=document.getElementById("loginError");
  try{const data=await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({correo:document.getElementById("usuario").value,password:document.getElementById("password").value})}); localStorage.setItem("adminToken",data.token); funcionarioSesion=data.funcionario; await mostrarDashboard();}
  catch(e){errorEl.textContent=e.message;errorEl.style.display="block";}
}
function cerrarSesion(){ localStorage.removeItem("adminToken"); localStorage.removeItem("adminFuncionario"); location.reload(); }
async function mostrarDashboard(){ try{funcionarioSesion=funcionarioSesion||await api("/api/admin/me");localStorage.setItem("adminFuncionario",JSON.stringify(funcionarioSesion));aplicarPermisosUI();document.getElementById("loginSection").style.display="none";document.getElementById("adminAppContainer").style.display="flex";document.getElementById("funcionarioActual").textContent=funcionarioSesion.nombre+" · "+funcionarioSesion.cargo;cargar();}catch(e){cerrarSesion();} }
function navegar(hash){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  document.querySelector(hash)?.classList.remove("hidden");
  document.querySelectorAll("nav a").forEach(x=>x.classList.toggle("active",x.getAttribute("href")===hash));
  if(hash==="#documentos") renderRevision();
  if(hash==="#estudiantes") renderEstudiantes();
  if(hash==="#reportes") renderReportes();
  if(hash==="#funcionarios") renderFuncionarios();
}

async function cargar(){
  try {
    postulaciones = await api("/api/postulaciones");
    const s = await api("/api/estadisticas");
    ["total","pendientes","enRevision","subsanacion","aprobadas","noAprobadas"].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent=s[id] ?? 0;});
    poblarFiltros(); renderPostulaciones(); renderDashboard();
  } catch(e){ mensaje(e.message,"error"); }
}

function poblarFiltros(){
  const uni=document.getElementById("filtroPostUniversidad");
  if(uni){ const actual=uni.value; const vals=[...new Set(postulaciones.map(p=>p.universidad).filter(Boolean))].sort(); uni.innerHTML='<option value="">Todas las universidades</option>'+vals.map(v=>`<option>${esc(v)}</option>`).join(''); uni.value=actual; }
}
function filtrarPostulaciones(){
  const q=(document.getElementById("busqueda")?.value||"").toLowerCase();
  const tipo=document.getElementById("filtroTipo")?.value||"";
  const estado=document.getElementById("filtroEstado")?.value||"";
  const beneficio=document.getElementById("filtroBeneficio")?.value||"";
  const universidad=document.getElementById("filtroPostUniversidad")?.value||"";
  return postulaciones.filter(p=>{
    const texto=[p.nombre,p.documento,p.radicado,p.universidad,p.carrera].join(" ").toLowerCase();
    const beneficios=Array.isArray(p.beneficios)?p.beneficios:[];
    return (!q||texto.includes(q)) && (!tipo||tipoDe(p)===tipo) && (!estado||p.estado===estado) && (!beneficio||beneficios.includes(beneficio)||p.linea_formacion===beneficio) && (!universidad||p.universidad===universidad);
  });
}
function table(rows){
  if(!rows.length) return '<div class="empty">No se encontraron postulaciones.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Radicado</th><th>Estudiante</th><th>Tipo</th><th>Universidad</th><th>Beneficio / línea</th><th>Estado</th><th>Revisión docs.</th><th></th></tr></thead><tbody>${rows.map(p=>{
    const docs=p.documentos||[], aprob=docs.filter(d=>d.estado==="APROBADO").length;
    return `<tr><td>${esc(p.radicado)}</td><td><b>${esc(p.nombre)}</b><br><small>${esc(p.documento)}</small></td><td>${esc(tipoDe(p))}</td><td>${esc(p.universidad)}</td><td class="benef-cell">${esc(beneficiosTexto(p))}</td><td>${badge(p.estado)}</td><td>${aprob}/${docs.length}</td><td><button onclick="abrirRevision('${esc(p.id)}')">Revisar</button></td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function renderDashboard(){ document.getElementById("tablaDashboard").innerHTML=table([...postulaciones].slice(-8).reverse()); }
function renderPostulaciones(){ document.getElementById("tablaPostulaciones").innerHTML=table(filtrarPostulaciones()); }
function limpiarFiltros(){ ["busqueda","filtroTipo","filtroEstado","filtroBeneficio","filtroPostUniversidad"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";}); renderPostulaciones(); }

async function abrirRevision(id){
  try { const p=await api("/api/postulaciones/"+encodeURIComponent(id)); navegar("#documentos"); renderRevision(p); }
  catch(e){mensaje(e.message,"error");}
}
function renderRevision(p){
  const el=document.getElementById("revision");
  if(!p){
    el.innerHTML=postulaciones.length?postulaciones.map(x=>`<div class="doc"><div><b>${esc(x.nombre)}</b><br><small>${esc(x.radicado)} · ${(x.documentos||[]).length} documentos · ${badge(x.estado)}</small></div><button onclick="abrirRevision('${esc(x.id)}')">Abrir expediente</button></div>`).join(""):'<div class="empty">No hay expedientes para revisar.</div>';
    return;
  }
  const docs=[...(p.documentos||[])].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
  const aprob=docs.filter(d=>d.estado==="APROBADO").length, inconsist=docs.filter(d=>d.estado==="INCONSISTENTE").length, pend=docs.filter(d=>d.estado==="PENDIENTE").length;
  el.innerHTML=`<div class="expediente">
    <div class="exp-head"><div><span class="eyebrow">Expediente ${esc(p.radicado)}</span><h2>${esc(p.nombre)}</h2><div>${badge(p.estado)}</div></div><button class="secondary" onclick="renderRevision()">← Volver a expedientes</button></div>
    <div class="detail-grid">
      <div><small>Documento</small><b>${esc(p.documento)}</b></div><div><small>Correo</small><b>${esc(p.correo)}</b></div><div><small>Teléfono</small><b>${esc(p.telefono)}</b></div><div><small>Tipo</small><b>${esc(tipoDe(p))}</b></div>
      <div><small>Nivel</small><b>${esc(p.nivel_academico||"—")}</b></div><div><small>Universidad</small><b>${esc(p.universidad)}</b></div><div><small>Programa</small><b>${esc(p.carrera)}</b></div><div><small>Semestre</small><b>${esc(p.semestre)}</b></div>
    </div>
    <div class="info-box"><b>Beneficios solicitados:</b> ${esc(beneficiosTexto(p))}${p.condicion_reintegro?`<br><b>Condición de reintegro:</b> ${esc(CONDICIONES[p.condicion_reintegro]||p.condicion_reintegro)}`:""}</div>
    <div class="review-summary"><span>Documentos: <b>${docs.length}</b></span><span>Aprobados: <b>${aprob}</b></span><span>Pendientes: <b>${pend}</b></span><span>Con inconsistencia: <b>${inconsist}</b></span></div>
    <h3>Revisión documental</h3>
    ${docs.map(d=>`<div class="doc doc-review-card"><div class="doc-row"><div class="doc-info"><b>${esc(d.nombre)}</b><div>${badge(d.estado)} ${d.revisado_en?`<small>Revisado ${esc(fecha(d.revisado_en))}</small>`:""}</div>${d.observacion?`<p class="doc-observation">${esc(d.observacion)}</p>`:""}</div><div class="doc-actions"><button class="secondary doc-view-btn" id="btn-ver-${esc(d.id)}" onclick="verDocumentoSeguro('${esc(d.id)}')">Ver documento</button><button class="green" onclick="revisarDocumento('${esc(d.id)}','APROBADO')">Aprobar</button><button class="red" onclick="revisarDocumento('${esc(d.id)}','INCONSISTENTE')">Solicitar corrección (24 h)</button></div></div><div id="visor-${esc(d.id)}" class="doc-inline-viewer" style="display:none"><div class="doc-inline-head"><div><strong>Previsualización del documento</strong><small>El archivo se muestra dentro de esta misma tarjeta.</small></div><button class="viewer-close-btn" onclick="cerrarVisorDocumento('${esc(d.id)}')">✕ Cerrar</button></div><div class="doc-preview-body" id="preview-${esc(d.id)}"></div></div></div>`).join("")||'<div class="empty">Sin documentos.</div>'}
    <div class="decision-box"><h3>Decisión de la postulación</h3><label>Valor del subsidio / beneficio asignado ($)</label><div class="inline"><input type="number" id="inputValorBeneficio" min="0" value="${esc(p.valor_beneficio||"")}" placeholder="Ej. 1500000"><button class="secondary" onclick="guardarValorBeneficio('${esc(p.id)}')">Guardar valor</button></div><label>Observación general</label><textarea id="observacionGeneral" rows="3" placeholder="Comentario para el expediente...">${esc(p.observacion||"")}</textarea><div class="decision-actions"><button class="secondary" onclick="cambiarEstado('${esc(p.id)}','EN REVISIÓN')">En revisión</button><button class="orange-btn" onclick="cambiarEstado('${esc(p.id)}','SUBSANACIÓN')">Enviar a subsanación</button><button class="green" onclick="cambiarEstado('${esc(p.id)}','APROBADO')" ${docs.length&&aprob===docs.length?'':'title="Todos los documentos deben estar aprobados"'}>Aprobar postulación</button><button class="red" onclick="cambiarEstado('${esc(p.id)}','NO APROBADO')">No aprobar</button></div></div>
    <div class="history"><h3>Historial del expediente</h3>${(p.historial||[]).slice().reverse().map(h=>`<div class="history-row"><b>${esc(h.accion)}</b><span>${esc(h.detalle)}</span></div>`).join("")||'<div class="empty">Sin movimientos registrados.</div>'}</div>
  </div>`;
}

async function revisarDocumento(id,estado){
  let observacion="";
  if(estado==="INCONSISTENTE") { observacion=prompt("Describe qué debe corregir el estudiante:","")||""; if(!observacion.trim()) return; }
  try { const r=await api("/api/documentos/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({estado,observacion})}); await cargar(); abrirRevision(r.documento.postulacion_id); }
  catch(e){mensaje(e.message,"error");}
}
async function cambiarEstado(id,estado){
  const observacion=document.getElementById("observacionGeneral")?.value.trim()||"";
  if(["SUBSANACIÓN","NO APROBADO"].includes(estado)&&!observacion){ mensaje("Escribe una observación general antes de cambiar a este estado.","error"); return; }
  try { await api("/api/postulaciones/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({estado,observacion})}); await cargar(); await abrirRevision(id); mensaje("Estado actualizado correctamente."); }
  catch(e){mensaje(e.message,"error");}
}
async function guardarValorBeneficio(id){
  try { await api("/api/postulaciones/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({valor_beneficio:document.getElementById("inputValorBeneficio").value})}); await cargar(); await abrirRevision(id); mensaje("Valor guardado correctamente."); }
  catch(e){mensaje(e.message,"error");}
}
let visorDocumentoAbierto=null;
function cerrarVisorDocumento(id){const c=document.getElementById("visor-"+id),p=document.getElementById("preview-"+id),b=document.getElementById("btn-ver-"+id);if(p)p.innerHTML="";if(c)c.style.display="none";if(b){b.textContent="Ver documento";b.classList.remove("active-viewer");}if(visorDocumentoAbierto===id)visorDocumentoAbierto=null;}
async function verDocumentoSeguro(id){try{const actual=document.getElementById("visor-"+id);if(actual&&actual.style.display!=="none"){cerrarVisorDocumento(id);return;}if(visorDocumentoAbierto&&visorDocumentoAbierto!==id)cerrarVisorDocumento(visorDocumentoAbierto);const d=await api("/api/documentos/"+encodeURIComponent(id)+"/url");const c=document.getElementById("visor-"+id),p=document.getElementById("preview-"+id),b=document.getElementById("btn-ver-"+id);if(!c||!p)return;p.innerHTML=`<iframe src="${esc(d.url)}" title="Previsualización del documento" loading="lazy"></iframe>`;c.style.display="block";if(b){b.textContent="Ocultar documento";b.classList.add("active-viewer");}visorDocumentoAbierto=id;}catch(e){mensaje(e.message,"error");}}

async function renderEstudiantes(){
  try{listaEstudiantesGlobal=await api("/api/admin/estudiantes");const s=document.getElementById("filtroUniversidad");const a=s.value;const u=[...new Set(listaEstudiantesGlobal.flatMap(x=>x.universidades||[]))].sort();s.innerHTML='<option value="">Todas las universidades</option>'+u.map(x=>`<option>${esc(x)}</option>`).join('');s.value=a;pintarTablaEstudiantes(listaEstudiantesGlobal);}catch(e){mensaje(e.message,"error");}
}
function pintarTablaEstudiantes(rows){document.getElementById("tablaEstudiantes").innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Documento</th><th>Nombre</th><th>Universidad(es)</th><th>Solicitudes</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.documento)}</td><td><b>${esc(x.nombre)}</b></td><td>${esc((x.universidades||[]).join(", "))}</td><td>${x.postulaciones}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No se encontraron estudiantes.</div>';}
function filtrarEstudiantesPorUniversidad(){const u=document.getElementById("filtroUniversidad").value;pintarTablaEstudiantes(u?listaEstudiantesGlobal.filter(x=>(x.universidades||[]).includes(u)):listaEstudiantesGlobal);}

async function renderReportes(){
  try{const data=await api("/api/admin/reportes");const b=document.getElementById("graficoBeneficios"),u=document.getElementById("graficoUniversidades");if(!b||!u)return;if(chartBeneficiosInstance)chartBeneficiosInstance.destroy();if(chartUniversidadesInstance)chartUniversidadesInstance.destroy();chartBeneficiosInstance=new Chart(b,{type:"bar",data:{labels:Object.keys(data.beneficios||{}).map(x=>BENEFICIOS[x]||x),datasets:[{label:"Solicitudes",data:Object.values(data.beneficios||{})}]},options:{responsive:true,plugins:{legend:{display:false}}}});chartUniversidadesInstance=new Chart(u,{type:"doughnut",data:{labels:Object.keys(data.universidades||{}),datasets:[{data:Object.values(data.universidades||{})}]},options:{responsive:true}});}catch(e){mensaje(e.message,"error");}
}
function togglePasswordVisibility(){const i=document.getElementById("password");i.type=i.type==="password"?"text":"password";}

async function exportarExcelCompleto(){
  const btn=document.getElementById("btnExportarExcel");
  const original=btn?btn.innerHTML:"📊 Exportar a Excel";
  try{
    if(btn){btn.disabled=true;btn.innerHTML="Generando Excel...";}
    const r=await fetch("/api/admin/exportar-excel",{headers:{Authorization:"Bearer "+localStorage.getItem("adminToken")}});
    if(!r.ok){
      let msg="No fue posible generar el Excel.";
      try{const d=await r.json();msg=d.error||msg;}catch(_){}
      throw new Error(msg);
    }
    const blob=await r.blob();
    const cd=r.headers.get("Content-Disposition")||"";
    const m=cd.match(/filename="([^"]+)"/);
    const nombre=m?m[1]:"FOEST_Reporte.xlsx";
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download=nombre;document.body.appendChild(link);link.click();link.remove();
    URL.revokeObjectURL(url);
    mensaje("Excel generado correctamente.");
  }catch(e){mensaje(e.message,"error");}
  finally{if(btn){btn.disabled=false;btn.innerHTML=original;}}
}


// FASE 6.5.1 - Calculadora de promedio SOLO en revisión documental
function htmlCalculadoraPromedio(){
  return `<div id="calculadoraPromedioCreditos" class="calc-promedio-card">
    <div class="calc-promedio-head">
      <div><strong>Calculadora de promedio</strong><small>Promedio ponderado por créditos</small></div>
      <button type="button" class="calc-reset" onclick="reiniciarCalculadoraPromedio()">Limpiar</button>
    </div>
    <div id="filasPromedio" class="calc-filas"></div>
    <div class="calc-actions">
      <button type="button" class="calc-add" onclick="agregarFilaPromedio()">+ Materia</button>
      <div class="calc-resultado">Promedio: <strong id="resultadoPromedio">—</strong></div>
    </div>
  </div>`;
}

function agregarFilaPromedio(creditos="",nota=""){
  const filas=document.getElementById("filasPromedio");
  if(!filas)return;
  const row=document.createElement("div");
  row.className="calc-fila";
  row.innerHTML=`
    <label>Créditos
      <input class="calc-creditos" type="number" min="1" step="1" inputmode="numeric" value="${creditos}" placeholder="3">
    </label>
    <label>Nota
      <input class="calc-nota" type="number" min="0" max="5" step="0.01" inputmode="decimal" value="${nota}" placeholder="4.0">
    </label>
    <button type="button" class="calc-del" title="Quitar materia" aria-label="Quitar materia">×</button>`;
  row.querySelectorAll("input").forEach(i=>i.addEventListener("input",calcularPromedioCreditos));
  row.querySelector(".calc-del").addEventListener("click",()=>{row.remove();calcularPromedioCreditos();});
  filas.appendChild(row);
  calcularPromedioCreditos();
}

function calcularPromedioCreditos(){
  const filas=[...document.querySelectorAll("#filasPromedio .calc-fila")];
  let suma=0,totalCreditos=0,validas=0;
  filas.forEach(f=>{
    const c=Number(f.querySelector(".calc-creditos").value);
    const n=Number(f.querySelector(".calc-nota").value);
    // Créditos: únicamente enteros positivos. Nota: 0 a 5.
    if(Number.isInteger(c)&&c>=1&&Number.isFinite(n)&&n>=0&&n<=5){
      suma+=c*n;
      totalCreditos+=c;
      validas++;
    }
  });
  const out=document.getElementById("resultadoPromedio");
  if(out) out.textContent=validas&&totalCreditos>0?(suma/totalCreditos).toFixed(2):"—";
}

function reiniciarCalculadoraPromedio(){
  const filas=document.getElementById("filasPromedio");
  if(!filas)return;
  filas.innerHTML="";
  agregarFilaPromedio("","");
  agregarFilaPromedio("","");
}

function quitarCalculadoraPromedio(){
  document.getElementById("calculadoraPromedioCreditos")?.remove();
}

function montarCalculadoraSoloEnRevisionDocumental(){
  quitarCalculadoraPromedio();

  // Solo se admite un contenedor explícito de documentos dentro del detalle abierto.
  const selectores=[
    "#documentosDetalle",
    "#documentosPostulacion",
    "#detalleDocumentos",
    ".documentos-lista",
    ".docs-list"
  ];
  let cont=null;
  for(const sel of selectores){
    const el=document.querySelector(sel);
    if(el && el.offsetParent!==null){ cont=el; break; }
  }

  if(!cont) return;
  cont.insertAdjacentHTML("afterend",htmlCalculadoraPromedio());
  agregarFilaPromedio("","");
  agregarFilaPromedio("","");
}

document.addEventListener("click",(e)=>{
  const trigger=e.target.closest(
    '[data-id][onclick*="detalle"], [onclick*="verDetalle"], [onclick*="abrirDetalle"], '+
    '[onclick*="verPostulacion"], [onclick*="revisar"], .btn-ver, .btn-revisar'
  );
  if(trigger){
    setTimeout(montarCalculadoraSoloEnRevisionDocumental,120);
    setTimeout(montarCalculadoraSoloEnRevisionDocumental,450);
  }
  const nav=e.target.closest("nav a, .sidebar a, .menu button, [data-section], [data-view]");
  if(nav) quitarCalculadoraPromedio();
});


const PERMISOS_UI={VER_DASHBOARD:"Ver dashboard",VER_POSTULACIONES:"Ver postulaciones",REVISAR_DOCUMENTOS:"Revisar documentos",SOLICITAR_SUBSANACION:"Solicitar subsanaciones",APROBAR_POSTULACIONES:"Aprobar postulaciones",NO_APROBAR_POSTULACIONES:"No aprobar postulaciones",VER_ESTUDIANTES:"Ver estudiantes",VER_REPORTES:"Ver reportes",EXPORTAR_REPORTES:"Exportar Excel"};
function tienePermiso(p){return funcionarioSesion?.rol==="SUPERADMIN"||(funcionarioSesion?.permisos||[]).includes(p)}
function aplicarPermisosUI(){document.querySelectorAll("[data-permiso]").forEach(e=>e.style.display=tienePermiso(e.dataset.permiso)?"":"none"); if(!tienePermiso("REVISAR_DOCUMENTOS"))document.querySelector('nav a[href="#documentos"]')?.style.setProperty("display","none"); if(!tienePermiso("VER_ESTUDIANTES"))document.querySelector('nav a[href="#estudiantes"]')?.style.setProperty("display","none");}
function mostrarCrearFuncionario(){document.getElementById("formFuncionario").style.display="block";document.getElementById("listaPermisos").innerHTML=Object.entries(PERMISOS_UI).map(([k,v])=>`<label class="perm-item"><input type="checkbox" value="${k}"> ${v}</label>`).join("");}
async function crearFuncionario(){try{const permisos=[...document.querySelectorAll("#listaPermisos input:checked")].map(x=>x.value);const d=await api("/api/admin/funcionarios",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre:funNombre.value,correo:funCorreo.value,cargo:funCargo.value,permisos})});const b=document.getElementById("passwordTemporal");b.style.display="block";b.className="admin-message ok";b.innerHTML=`Cuenta creada para <b>${esc(d.funcionario.nombre)}</b>. Contraseña temporal (se muestra una sola vez): <b>${esc(d.passwordTemporal)}</b>`;document.getElementById("formFuncionario").style.display="none";renderFuncionarios();}catch(e){mensaje(e.message,"error")}}
async function renderFuncionarios(){if(!tienePermiso("GESTIONAR_FUNCIONARIOS"))return;try{const rows=await api("/api/admin/funcionarios");document.getElementById("tablaFuncionarios").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Funcionario</th><th>Cargo</th><th>Rol</th><th>Permisos</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map(f=>`<tr><td><b>${esc(f.nombre)}</b><br><small>${esc(f.correo)}</small></td><td>${esc(f.cargo)}</td><td>${esc(f.rol)}</td><td>${f.rol==='SUPERADMIN'?'Acceso total':esc((f.permisos||[]).map(p=>PERMISOS_UI[p]||p).join(', '))}</td><td>${f.activo?'🟢 Activo':'⚪ Inactivo'}</td><td>${f.rol==='SUPERADMIN'?'—':`<button class="secondary" onclick='editarFuncionario(${JSON.stringify(f)})'>Editar</button>`}</td></tr>`).join('')}</tbody></table></div>`}catch(e){mensaje(e.message,"error")}}
function editarFuncionario(f){const nombre=prompt("Nombre",f.nombre);if(nombre===null)return;const cargo=prompt("Cargo",f.cargo);if(cargo===null)return;const activo=confirm("Aceptar = cuenta activa. Cancelar = desactivar cuenta.");const actuales=new Set(f.permisos||[]);const elegidos=Object.entries(PERMISOS_UI).filter(([k,v])=>confirm(`${v}\n\nAceptar = conceder permiso\nCancelar = no conceder`)).map(([k])=>k);api("/api/admin/funcionarios/"+f.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre,cargo,activo,permisos:elegidos})}).then(()=>renderFuncionarios()).catch(e=>mensaje(e.message,"error"));}
async function cambiarMiPassword(){if(miPassword.value!==miPassword2.value)return mensaje("Las contraseñas no coinciden.","error");try{await api("/api/admin/cambiar-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:miPassword.value})});miPassword.value=miPassword2.value="";mensaje("Contraseña actualizada correctamente.");}catch(e){mensaje(e.message,"error")}}

function toggleAdminPassword(id,btn){
  const input=document.getElementById(id);
  if(!input)return;
  const mostrar=input.type==="password";
  input.type=mostrar?"text":"password";
  btn.textContent=mostrar?"🙈":"👁";
  btn.setAttribute("aria-label",mostrar?"Ocultar contraseña":"Mostrar contraseña");
}
