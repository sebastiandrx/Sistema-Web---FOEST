const UNIVERSIDADES_FOEST = ["UNIVERSIDAD LA GRAN COLOMBIA", "POLITÉCNICO GRANCOLOMBIANO", "ESCUELA DE ADMINISTRACIÓN DE NEGOCIOS - EAN", "ESCUELA COLOMBIANA DE INGENIERÍA JULIO GARAVITO", "UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA - UNAD", "UNIVERSIDAD SERGIO ARBOLEDA", "FUNDACIÓN DE EDUCACIÓN NUEVA AMÉRICA", "FUNDACIÓN UNIVERSITARIA COLOMBO GERMANA - UNIGERMANA", "INSTITUCIÓN UNIVERSITARIA COLEGIOS DE COLOMBIA - UNICOC", "CORPORACIÓN UNIVERSITARIA TALLER CINCO", "FUNDACIÓN UNIVERSITARIA LOS LIBERTADORES", "UNIVERSIDAD COOPERATIVA DE COLOMBIA", "FUNDACIÓN UNIVERSITARIA AGRARIA DE COLOMBIA", "CORPORACIÓN UNIFICADA NACIONAL DE EDUCACIÓN SUPERIOR - CUN", "UNIVERSIDAD ECCI", "UNIVERSIDAD DE LA SABANA", "UNIVERSIDAD DE CIENCIAS APLICADAS Y AMBIENTALES - UDCA", "CORPORACIÓN UNIVERSITARIA CENDA", "ESCUELA COLOMBIANA DE REHABILITACIÓN"];
const form = document.getElementById("postulacionForm");

const BENEFIT_LABELS = {
  S11: "Incentivo a los mejores puntajes Pruebas ICFES - Saber 11 (S11)",
  EA: "Incentivo a la Excelencia Académica (EA)",
  DEP: "Incentivo al Mejor Deportista (DEP)",
  CUL: "Incentivo a la Cultura (CUL)",
  SUP: "Incentivo a la Superación (SUP)",
  ST: "Subsidio de Transporte (ST)",
  AS: "Apoyo de Sostenimiento (AS)",
  AM: "Apoyo a la Movilidad Nacional e Internacional (AM)",
  AI: "Apoyo a la Investigación (AI)"
};

const LINE_LABELS = {
  LINEA_1: "Línea Estratégica No. 1 - Auxilio 100% por convenio",
  LINEA_2: "Línea Estratégica No. 2 - Pacto entre tres",
  LINEA_3: "Línea Estratégica No. 3 - Pacto entre cuatro",
  LINEA_4: "Línea Estratégica No. 4 - Pacto especial",
  LINEA_5: "Línea Estratégica No. 5 - Igualdad Asertiva",
  LINEA_6: "Línea Estratégica No. 6 - Posgrados"
};

const DOC_RULES = {
  "PRIMERA VEZ": {
    general: [
      ["formulario_fisico", "Formulario de solicitud de beneficios FOEST físico"],
      ["formulario_virtual", "Pantallazo impreso y firmado del Formulario de inscripción FOEST virtual"],
      ["foto_3x4", "Fotografía 3x4 con fondo azul o fondo blanco"],
      ["documento_identidad", "Copia legible del documento de identidad ampliada al 150%"],
      ["diploma_bachiller", "Copia del diploma de bachiller"],
      ["resultado_saber11", "Copia del resultado de las pruebas ICFES - Saber 11"],
      ["sisben", "Soporte de inscripción activa en el Sisbén de Tocancipá con mínimo 5 años consecutivos a la fecha de postulación"],
      ["residencia", "Certificado de residencia en el Municipio de Tocancipá"],
      ["matricula", "Copia de recibo de pago de la Universidad y/o certificación de matrícula"],
      ["carta_pagare", "Carta de instrucciones y pagaré firmado"]
    ]
  },
  "RENOVACIÓN": {
    general: [
      ["formulario_fisico", "Formulario de solicitud de beneficios FOEST físico"],
      ["formulario_virtual", "Pantallazo impreso y firmado del Formulario de inscripción FOEST virtual"],
      ["foto_3x4", "Fotografía 3x4 con fondo azul o fondo blanco"],
      ["documento_identidad_actualizado", "Copia legible del documento de identidad ampliada al 150% (únicamente si fue actualizado)"],
      ["sisben", "Soporte de inscripción activa en el Sisbén de Tocancipá con mínimo 5 años consecutivos a la fecha de postulación"],
      ["residencia", "Certificado de residencia en el Municipio de Tocancipá (únicamente para beneficiarios del Acuerdo 023 de 2025)"],
      ["matricula", "Copia de recibo de pago de la Universidad y/o certificación de matrícula"],
      ["carta_pagare", "Carta de instrucciones y pagaré firmado"],
      ["horas_sociales", "Certificado del registro de horas sociales realizadas en la Administración Municipal"],
      ["notas_originales", "Certificado de notas original expedido por la Universidad o Institución de Educación Superior"]
    ]
  },
  "REINTEGRO": {
    general: [
      ["formulario_fisico", "Formulario de solicitud de beneficios FOEST físico"],
      ["formulario_virtual", "Pantallazo impreso y firmado del Formulario de inscripción FOEST virtual"],
      ["foto_3x4", "Fotografía 3x4 con fondo azul o fondo blanco"],
      ["documento_identidad_actualizado", "Copia legible del documento de identidad ampliada al 150% (únicamente si fue actualizado)"],
      ["sisben", "Soporte de inscripción activa en el Sisbén de Tocancipá con mínimo 5 años consecutivos a la fecha de postulación"],
      ["residencia", "Certificado de residencia en el Municipio de Tocancipá (únicamente para beneficiarios del Acuerdo 023 de 2025)"],
      ["matricula", "Copia de recibo de pago de la Universidad y/o certificación de matrícula"],
      ["carta_pagare", "Carta de instrucciones y pagaré firmado"],
      ["horas_sociales", "Certificado del registro de horas sociales realizadas en la Administración Municipal"],
      ["notas_ultimo_periodo_foest", "Certificado de notas original del último periodo solicitado con apoyos económicos del programa FOEST"],
      ["notas_ultimo_periodo_cursado", "Certificado de notas original del último periodo cursado (solo cuando el motivo del reintegro sea el incumplimiento del promedio académico)"]
    ]
  }
};

const BENEFIT_DOCS = {
  S11: [
    ["s11_secretaria", "Certificación de la Secretaría de Educación donde conste que el estudiante tuvo el mejor puntaje ICFES (Saber 11)"],
    ["s11_institucion", "Certificación de la institución educativa oficial y/o no oficial donde se acredite el mejor puntaje ICFES (Saber 11) a nivel municipal"]
  ],
  EA: [["excelencia_certificacion", "Certificación emitida por la institución educativa oficial y/o no oficial donde se acredite el mejor promedio académico"]],
  DEP: [["deportista_certificacion", "Certificación emitida por el IMRDT donde se acredite al estudiante como mejor deportista"]],
  CUL: [
    ["cultura_secretaria", "Certificación emitida por la Secretaría de Cultura y Patrimonio donde se acredite al estudiante como mejor artista"],
    ["cultura_consejo", "Certificación emitida por el Consejo Municipal de Cultura donde se evidencie la representación destacada del Municipio de Tocancipá"]
  ],
  SUP: [["superacion_certificacion", "Certificación médica vigente que indique tipo y grado de discapacidad, o certificación de la Secretaría de Familia e Integración Social"]],
  ST: [["horario_clases", "Horario detallado de clases generado por la Institución de Educación Superior"]],
  AI: [["anteproyecto_investigacion", "Anteproyecto de investigación"]],
  AS: [
    ["presupuesto_sostenimiento", "Presupuesto de gastos de sostenimiento"],
    ["soportes_sostenimiento", "Soportes de gastos de sostenimiento"]
  ],
  AM: [
    ["presupuesto_movilidad", "Presupuesto de gastos de movilidad y 3 cotizaciones de tiquetes aéreos de diferentes aerolíneas"],
    ["soportes_movilidad", "Soportes de gastos de movilidad: documento de pago del tiquete aéreo nacional y/o internacional"]
  ]
};

const REINTEGRO_DOCS = {
  ACUERDO_12_2016: [["sisben_transicion_12_2016", "Soporte de 3 años de antigüedad en la base de datos del Sisbén de Tocancipá"]],
  ACUERDO_02_2023: [["sisben_transicion_02_2023", "Soporte de mínimo 5 años de antigüedad en el Sisbén de Tocancipá al año 2021 y estado activo a la fecha de consulta"]]
};

const SCHOOLING_STANDARD_LINES = ["LINEA_1", "LINEA_2", "LINEA_3", "LINEA_4", "LINEA_6"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obtenerTipoPostulacion() {
  return document.querySelector('select[name="tipoPostulacion"]')?.value || "PRIMERA VEZ";
}

function obtenerBeneficios() {
  return [...document.querySelectorAll('input[name="beneficios"]:checked')].map(i => i.value);
}

function obtenerLineaFormacion() {
  return document.querySelector('input[name="lineaFormacion"]:checked')?.value || "";
}

function obtenerNivelAcademico() {
  return document.querySelector('select[name="nivelAcademico"]')?.value || "";
}

function obtenerCondicionReintegro() {
  return document.getElementById("condicionReintegro")?.value || "";
}

function requiereEscolaridad(beneficios, linea) {
  const tieneEspecial = benefitsHasAny(beneficios, ["S11", "EA", "DEP", "CUL", "SUP"]);
  const tieneFormacion = Boolean(linea);
  return tieneEspecial || tieneFormacion;
}

function benefitsHasAny(beneficios, codigos) {
  return codigos.some(code => beneficios.includes(code));
}

function escolaridadDescripcion(linea, nivel, tipo, condicion) {
  if (linea === "LINEA_5") {
    if (nivel === "POSGRADO") {
      return "La Línea Estratégica No. 5 - Igualdad Asertiva está disponible únicamente para solicitudes de pregrado según la condición suministrada por FOEST.";
    }
    return "Haber aprobado como mínimo 5 años de estudios en instituciones oficiales y no oficiales de Gachancipá, Sopó, Chía, Cajicá o Zipaquirá. Esta condición aplica únicamente para solicitudes de pregrado.";
  }
  if (tipo === "REINTEGRO" && condicion === "CAMBIO_PROGRAMA_POSGRADO") {
    return "Para el reintegro por cambio de programa o paso a posgrado: haber aprobado como mínimo 5 años de estudios en instituciones oficiales y no oficiales de Tocancipá, cuando corresponda a las líneas 1, 2, 3, 4 o 6.";
  }
  return "Haber aprobado como mínimo 5 años de estudios en instituciones oficiales y no oficiales del Municipio de Tocancipá.";
}

function agregarGrupoDocumentos(contenedor, titulo, documentos, opciones = {}) {
  if (!documentos.length) return;
  const grupo = document.createElement("div");
  grupo.className = "document-group";
  grupo.innerHTML = `<h4>${escapeHtml(titulo)}</h4>`;

  documentos.forEach(([field, label]) => {
    const opcional = opciones.opcionales?.includes(field);
    const multiple = opciones.multiple?.includes(field);
    const item = document.createElement("div");
    item.className = "document-item";
    item.innerHTML = `
      <div class="document-label">
        ${escapeHtml(label)}
        <small>${opcional ? "Opcional / solo cuando aplique" : multiple ? "Requerido · puede adjuntar varios archivos" : "Documento requerido"}</small>
      </div>
      <input type="file" name="${escapeHtml(field)}" accept=".pdf,.jpg,.jpeg,.png" ${multiple ? "multiple" : ""} ${opcional ? "" : "required"}>
    `;
    grupo.appendChild(item);
  });
  contenedor.appendChild(grupo);
}

function actualizarSeccionesBeneficios() {
  const check = document.getElementById("beneficioFormacion");
  const lineas = document.getElementById("lineasFormacion");
  const tipo = obtenerTipoPostulacion();
  const reintegro = document.getElementById("reintegrationOptions");
  const nivel = obtenerNivelAcademico();

  if (lineas) lineas.style.display = check?.checked ? "block" : "none";
  if (reintegro) reintegro.style.display = tipo === "REINTEGRO" ? "block" : "none";

  if (tipo !== "REINTEGRO") {
    const select = document.getElementById("condicionReintegro");
    if (select) select.value = "";
  }

  const line5 = document.querySelector('input[name="lineaFormacion"][value="LINEA_5"]');
  if (line5) {
    line5.disabled = nivel === "POSGRADO";
    if (line5.disabled && line5.checked) line5.checked = false;
  }

  actualizarDocumentos();
}

function actualizarDocumentos() {
  const contenedor = document.getElementById("listaDocumentosRequeridos");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const tipo = obtenerTipoPostulacion();
  const beneficios = obtenerBeneficios();
  const linea = obtenerLineaFormacion();
  const condicion = obtenerCondicionReintegro();
  const nivel = obtenerNivelAcademico();
  const advertencia = document.getElementById("advertenciaBeneficios");
  const rules = DOC_RULES[tipo];
  if (!rules) return;

  agregarGrupoDocumentos(contenedor, "Documentos generales", rules.general, {
    opcionales: tipo === "RENOVACIÓN" || tipo === "REINTEGRO"
      ? ["documento_identidad_actualizado", "residencia"]
      : []
  });

  const escolaridadNecesaria = requiereEscolaridad(beneficios, linea);
  if (escolaridadNecesaria) {
    if (linea === "LINEA_5" && nivel === "POSGRADO") {
      const aviso = document.createElement("div");
      aviso.className = "warning-box";
      aviso.textContent = "La Línea Estratégica No. 5 - Igualdad Asertiva aplica únicamente para solicitudes de pregrado. Seleccione Pregrado o cambie de línea.";
      contenedor.appendChild(aviso);
    } else {
      agregarGrupoDocumentos(contenedor, "Certificación de escolaridad", [[
        "certificado_escolaridad",
        escolaridadDescripcion(linea, nivel, tipo, condicion)
      ]]);
    }
  }

  ["S11", "EA", "DEP", "CUL", "SUP"].filter(b => beneficios.includes(b)).forEach(code => {
    agregarGrupoDocumentos(contenedor, BENEFIT_LABELS[code], BENEFIT_DOCS[code]);
  });

  ["ST", "AI", "AS", "AM"].filter(b => beneficios.includes(b)).forEach(code => {
    const opciones = {};
    if (code === "AM") opciones.multiple = ["presupuesto_movilidad"];
    agregarGrupoDocumentos(contenedor, BENEFIT_LABELS[code], BENEFIT_DOCS[code], opciones);
  });

  if (tipo === "REINTEGRO" && condicion && REINTEGRO_DOCS[condicion]) {
    agregarGrupoDocumentos(contenedor, "Requisitos especiales de reintegro", REINTEGRO_DOCS[condicion]);
  }

  if (advertencia) {
    const mensajes = [];
    if (!beneficios.length && !document.getElementById("beneficioFormacion")?.checked) {
      mensajes.push("Seleccione al menos un beneficio o apoyo.");
    }
    if (document.getElementById("beneficioFormacion")?.checked && !linea) {
      mensajes.push("Seleccione una línea estratégica dentro de Incentivos a la formación.");
    }
    if (tipo === "REINTEGRO" && !condicion) {
      mensajes.push("Seleccione la condición que corresponde a su reintegro para determinar los requisitos de transición.");
    }
    if (linea === "LINEA_5" && nivel === "POSGRADO") {
      mensajes.push("Igualdad Asertiva (Línea 5) solo está disponible para solicitudes de pregrado según la información suministrada por FOEST.");
    }
    advertencia.innerHTML = mensajes.map(escapeHtml).join("<br>");
    advertencia.style.display = mensajes.length ? "block" : "none";
  }
}

function prepararFormularioBeneficios() {
  const formacion = document.getElementById("beneficioFormacion");
  if (formacion) formacion.addEventListener("change", actualizarSeccionesBeneficios);

  document.querySelectorAll('input[name="beneficios"], input[name="lineaFormacion"]').forEach(input => {
    input.addEventListener("change", actualizarDocumentos);
  });

  document.querySelector('select[name="tipoPostulacion"]')?.addEventListener("change", actualizarSeccionesBeneficios);
  document.getElementById("condicionReintegro")?.addEventListener("change", actualizarDocumentos);
  actualizarSeccionesBeneficios();
}

if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const resultado = document.getElementById("resultado");
    const tipo = obtenerTipoPostulacion();
    const formacion = document.getElementById("beneficioFormacion")?.checked;
    const linea = obtenerLineaFormacion();
    const beneficios = obtenerBeneficios();

    if (!beneficios.length && !formacion) {
      resultado.innerHTML = `<div class="error">Debe seleccionar al menos un beneficio o apoyo.</div>`;
      return;
    }
    if (formacion && !linea) {
      resultado.innerHTML = `<div class="error">Seleccione una línea estratégica de Incentivos a la formación.</div>`;
      return;
    }
    if (!obtenerNivelAcademico()) {
      resultado.innerHTML = `<div class="error">Seleccione el nivel académico: Pregrado o Posgrado.</div>`;
      return;
    }
    if (linea === "LINEA_5" && obtenerNivelAcademico() === "POSGRADO") {
      resultado.innerHTML = `<div class="error">La Línea Estratégica No. 5 - Igualdad Asertiva aplica únicamente para solicitudes de pregrado.</div>`;
      return;
    }
    if (tipo === "REINTEGRO" && !obtenerCondicionReintegro()) {
      resultado.innerHTML = `<div class="error">Seleccione la condición que corresponde a su reintegro.</div>`;
      return;
    }

    resultado.innerHTML = "Enviando...";
    const fd = new FormData(form);
    fd.delete("beneficio_categoria");
    fd.delete("beneficios");
    fd.append("beneficios", JSON.stringify(beneficios));
    fd.append("lineaFormacion", linea);
    fd.append("formacionSeleccionada", formacion ? "true" : "false");

    try {
      const r = await fetch("/api/postulaciones", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo radicar");
      resultado.innerHTML = `<div class="success"><b>¡Postulación radicada!</b><br>Radicado: ${escapeHtml(data.postulacion.radicado)}<br>ID para consulta: <b>${escapeHtml(data.postulacion.id)}</b><br>Estado inicial: PENDIENTE</div>`;
      form.reset();
      document.getElementById("lineasFormacion").style.display = "none";
      document.getElementById("reintegrationOptions").style.display = "none";
      actualizarDocumentos();
    } catch (err) {
      resultado.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function consultar() {
  const id = document.getElementById("consultaId").value.trim();
  const box = document.getElementById("consultaResultado");
  if (!id) return;
  try {
    const r = await fetch("/api/postulaciones/" + encodeURIComponent(id));
    const p = await r.json();
    if (!r.ok) throw new Error(p.error);
    box.innerHTML = `<div class="success"><b>${escapeHtml(p.nombre)}</b><br>Radicado: ${escapeHtml(p.radicado)}<br>Estado: <b>${escapeHtml(p.estado)}</b><br>Universidad: ${escapeHtml(p.universidad)}<br>Beneficios: ${(p.beneficios || []).map(escapeHtml).join(", ") || "No registrados"}<br><br>Documentos revisados: ${(p.documentos || []).filter(d => d.estado === "APROBADO").length}/${(p.documentos || []).length}</div>`;
  } catch (e) { box.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`; }
}

function verificarSesionYPostular() {
  const token = localStorage.getItem("estudianteToken");
  if (!token) window.location.href = '/estudiante/login.html';
  else document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener("DOMContentLoaded", () => {
  prepararFormularioBeneficios();

  const token = localStorage.getItem("estudianteToken");
  const usuarioData = JSON.parse(localStorage.getItem("estudianteData") || "{}");
  const seccionFormulario = document.getElementById("formulario");
  const seccionHistorial = document.getElementById("seccionHistorial");
  const menuUsuario = document.getElementById("menuUsuario");
  const saludoEstudiante = document.getElementById("saludoEstudiante");

  if (token && usuarioData.documento) {
    if (seccionFormulario) seccionFormulario.style.display = "block";
    if (seccionHistorial) seccionHistorial.style.display = "block";
    if (menuUsuario) menuUsuario.style.display = "flex";
    if (saludoEstudiante) saludoEstudiante.textContent = `Hola, ${usuarioData.nombre || 'Estudiante'}`;

    const inputDoc = document.querySelector('input[name="documento"]');
    const inputNom = document.querySelector('input[name="nombre"]');
    const inputCorreo = document.querySelector('input[name="correo"]');
    if (inputDoc) inputDoc.value = usuarioData.documento || "";
    if (inputNom) inputNom.value = usuarioData.nombre || "";
    if (inputCorreo) inputCorreo.value = usuarioData.correo || "";

    cargarHistorialEstudiante(usuarioData.documento);
  } else {
    if (seccionFormulario) seccionFormulario.style.display = "none";
    if (seccionHistorial) seccionHistorial.style.display = "none";
    if (menuUsuario) menuUsuario.style.display = "none";
  }
});

let misPostulacionesGlobales = [];

async function cargarHistorialEstudiante(documento) {
  try {
    const res = await fetch(`/api/estudiante/postulaciones?documento=${encodeURIComponent(documento)}`);
    const data = await res.json();
    misPostulacionesGlobales = data;
    renderizarListaHistorial(misPostulacionesGlobales);
  } catch (error) {
    console.error("Error al cargar historial:", error);
  }
}

function renderizarListaHistorial(lista) {
  const contenedor = document.getElementById("listaMisPostulaciones");
  if (!contenedor) return;
  if (!lista.length) {
    contenedor.innerHTML = `<p class="muted">No se encontraron postulaciones con los filtros seleccionados.</p>`;
    return;
  }
  contenedor.innerHTML = lista.map(p => `
    <div style="border: 1px solid var(--gris-borde, #e2e8f0); padding: 15px; border-radius: 8px; margin-bottom: 10px; background: #fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <strong>Radicado: ${escapeHtml(p.radicado)}</strong>
        <span class="badge ${p.estado === 'APROBADO' ? 'ok' : p.estado === 'NO APROBADO' ? 'bad' : 'warn'}">${escapeHtml(p.estado)}</span>
      </div>
      <p style="margin: 8px 0 4px 0; font-size: 14px;"><b>Universidad:</b> ${escapeHtml(p.universidad)} (${escapeHtml(p.carrera)})</p>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><b>Fecha:</b> ${p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</p>
      <p style="margin: 0 0 6px 0; font-size: 13px;"><b>Beneficios:</b> ${(p.beneficios || []).map(escapeHtml).join(", ") || "Ninguno"}</p>
      ${p.linea_formacion ? `<p style="margin: 0; font-size: 13px;"><b>Línea de formación:</b> ${escapeHtml(LINE_LABELS[p.linea_formacion] || p.linea_formacion)}</p>` : ""}
      ${p.observacion ? `<div style="margin-top:10px;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:13px;color:#991b1b;"><b>Motivo:</b> ${escapeHtml(p.observacion)}</div>` : ''}
      ${renderSubsanaciones(p)}
    </div>
  `).join('');
}

function tiempoRestanteSubsanacion(fechaVence) {
  const ms = new Date(fechaVence).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return { vencido: true, texto: "Plazo vencido" };
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  return { vencido: false, texto: `${horas} h ${minutos} min restantes` };
}
function renderSubsanaciones(p) {
  const docs=(p.documentos||[]).filter(d=>d.estado==="INCONSISTENTE"&&d.subsanacion_vence_en);
  if(!docs.length)return "";
  return `<div class="subsanacion-box"><b>Subsanación documental</b>
  <p>Solo puedes reemplazar los documentos indicados por FOEST.</p>
  ${docs.map(d=>{const t=tiempoRestanteSubsanacion(d.subsanacion_vence_en);return `<div class="subsanacion-doc">
    <div><strong>${escapeHtml(d.nombre)}</strong><div class="subsanacion-observacion">${escapeHtml(d.observacion||"Documento requiere corrección.")}</div>
    <span class="${t.vencido?"subsanacion-vencida":"subsanacion-tiempo"}">${escapeHtml(t.texto)}</span></div>
    ${t.vencido?`<button type="button" disabled>Plazo vencido</button>`:`<div class="subsanacion-upload"><input type="file" id="sub-${escapeHtml(d.id)}" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"><button type="button" onclick="subsanarDocumento('${escapeHtml(d.id)}')">Reemplazar documento</button></div>`}
  </div>`}).join("")}</div>`;
}
async function subsanarDocumento(id) {
  const input=document.getElementById("sub-"+id);
  const u=JSON.parse(localStorage.getItem("estudianteData")||"{}");
  if(!input?.files?.[0]){alert("Selecciona el archivo corregido.");return;}
  const fd=new FormData(); fd.append("archivo",input.files[0]); fd.append("documento",u.documento||"");
  try{
    const r=await fetch(`/api/estudiante/documentos/${encodeURIComponent(id)}/subsanar`,{method:"POST",body:fd});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||"No fue posible cargar la corrección.");
    alert("Documento reemplazado correctamente. Quedó pendiente de nueva revisión.");
    await cargarHistorialEstudiante(u.documento);
  }catch(e){alert(e.message);}
}

function filtrarHistorial() {
  const beneficioSeleccionado = document.getElementById("filtroBeneficio").value;
  const fechaSeleccionada = document.getElementById("filtroFecha").value;
  const filtrados = misPostulacionesGlobales.filter(p => {
    const coincideBeneficio = !beneficioSeleccionado || (p.beneficios && p.beneficios.includes(beneficioSeleccionado));
    let coincideFecha = true;
    if (fechaSeleccionada && p.created_at) coincideFecha = p.created_at.split('T')[0] === fechaSeleccionada;
    return coincideBeneficio && coincideFecha;
  });
  renderizarListaHistorial(filtrados);
}

function limpiarFiltros() {
  document.getElementById("filtroBeneficio").value = "";
  document.getElementById("filtroFecha").value = "";
  renderizarListaHistorial(misPostulacionesGlobales);
}

function cerrarSesionEstudiante() {
  localStorage.removeItem("estudianteToken");
  localStorage.removeItem("estudianteData");
  window.location.reload();
}

function normalizarBusquedaUniversidad(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function iniciarBuscadorUniversidades() {
  const input=document.getElementById("universidadBusqueda");
  const hidden=document.getElementById("universidad");
  const lista=document.getElementById("universidadOpciones");
  const estado=document.getElementById("universidadSeleccionada");
  if(!input||!hidden||!lista)return;

  const pintar=(q="")=>{
    const nq=normalizarBusquedaUniversidad(q);
    const resultados=UNIVERSIDADES_FOEST.filter(u=>normalizarBusquedaUniversidad(u).includes(nq));
    lista.innerHTML=resultados.length ? resultados.map(u =>
      `<button type="button" class="universidad-opcion" role="option" data-universidad="${escapeHtml(u)}">${escapeHtml(u)}</button>`
    ).join("") : `<div class="universidad-sin-resultados">No se encontraron universidades.</div>`;
    lista.hidden=false; input.setAttribute("aria-expanded","true");
  };
  const seleccionar=(u)=>{
    hidden.value=u; input.value=u;
    estado.textContent="Universidad seleccionada";
    estado.classList.add("ok");
    lista.hidden=true; input.setAttribute("aria-expanded","false");
  };

  input.addEventListener("focus",()=>pintar(input.value===hidden.value?"":input.value));
  input.addEventListener("input",()=>{
    hidden.value="";
    estado.textContent="Selecciona una universidad de la lista.";
    estado.classList.remove("ok");
    pintar(input.value);
  });
  lista.addEventListener("click",e=>{
    const b=e.target.closest("[data-universidad]");
    if(b) seleccionar(b.dataset.universidad);
  });
  document.addEventListener("click",e=>{
    if(!document.getElementById("universidadBuscador")?.contains(e.target)){
      lista.hidden=true; input.setAttribute("aria-expanded","false");
      if(!hidden.value) input.value="";
    }
  });
}
document.addEventListener("DOMContentLoaded", iniciarBuscadorUniversidades);



