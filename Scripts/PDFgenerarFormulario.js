// PDFgenerarFormulario.js
document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generatePDF');
  if (generateBtn) generateBtn.addEventListener('click', generatePDF);
});

function updateOwnerNameFromInput() {
  const input = document.getElementById('Nombre');
  const ownerNameEl = document.getElementById('owner-name');
  if (ownerNameEl && input) {
    ownerNameEl.textContent = input.value.trim() || 'Nombre de la persona';
  }
}

function triggerUpload(inputId) {
  document.getElementById(inputId)?.click();
}

function previewImage(event, id) {
  const reader = new FileReader();
  reader.onload = function () {
    const preview = document.getElementById(`${id}-preview`);
    preview.innerHTML = `
      <img src="${reader.result}" 
           alt="Imagen" 
           style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px;">
    `;
  };
  if (event.target.files && event.target.files[0]) {
    reader.readAsDataURL(event.target.files[0]);
  }
}

async function generatePDF() {
  const element = document.querySelector('.container');
  if (!element) return alert('No se encontró el contenido a exportar.');

  const generateButton = document.getElementById('generatePDF');
  if (generateButton) {
    generateButton.style.visibility = 'hidden'; // ocultar botón mientras se genera
  }

  // Antes de generar la captura, reemplazamos temporalmente los <textarea>
  // por <div> no editables con el mismo texto y estilos. html2canvas
  // suele renderizar mejor el texto en DIVs y respeta el wrapping.
  const textareas = Array.from(element.querySelectorAll('textarea'));
  const textareaReplacements = [];

  textareas.forEach(t => {
    const rect = t.getBoundingClientRect();
    const cs = window.getComputedStyle(t);

    const div = document.createElement('div');
    // Copiar el texto con preservación de saltos
    div.innerText = t.value || t.textContent || '';

    // Aplicar estilos esenciales para que se vea igual y permita wrapping
    div.style.font = cs.font;
    div.style.fontSize = cs.fontSize;
    div.style.lineHeight = cs.lineHeight;
    div.style.padding = cs.padding;
    div.style.margin = cs.margin;
    div.style.border = cs.border;
    div.style.boxSizing = cs.boxSizing;
    div.style.width = cs.width; // mantener ancho de la caja
    div.style.minHeight = (t.scrollHeight) + 'px';
    div.style.whiteSpace = 'pre-wrap';
    div.style.overflowWrap = 'break-word';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'visible';
    div.style.background = cs.backgroundColor;
    div.style.color = cs.color;

    // Añadir una clase para depuración si es necesario
    div.className = 'pdf-textarea-clone';

    // Insertar el DIV antes del textarea y ocultar el textarea original
    t.parentNode.insertBefore(div, t);
    const originalDisplay = t.style.display || '';
    t.style.display = 'none';

    textareaReplacements.push({ textarea: t, clone: div, originalDisplay });
  });

  // Antes de capturar, forzamos que el contenedor y el documento permitan
  // crecer para incluir todo el contenido. Luego usamos html2canvas con
  // width/height iguales a scrollWidth/scrollHeight para evitar recortes.
  const docEl = document.documentElement;
  const bodyEl = document.body;
  const originalDocOverflow = docEl.style.overflow || '';
  const originalBodyOverflow = bodyEl.style.overflow || '';
  const originalElementStyles = {
    height: element.style.height || '',
    maxHeight: element.style.maxHeight || '',
    overflow: element.style.overflow || '',
    width: element.style.width || ''
  };

  // Permitir crecimiento
  docEl.style.overflow = 'visible';
  bodyEl.style.overflow = 'visible';
  element.style.height = element.scrollHeight + 'px';
  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';

  try {
    console.log('Generando captura...');

    // Evitar recortes por límites máximos de canvas en el navegador.
    // Valores comunes máximos: ~32767 (depende del navegador/GC). Usamos un
    // umbral seguro y escalamos el render si el contenido es más grande.
    const MAX_CANVAS_DIM = 32767; // px
    const scrollW = Math.ceil(element.scrollWidth);
    const scrollH = Math.ceil(element.scrollHeight);

    // calcular factor de escala para que width y height queden por debajo del máximo
    const scaleForWidth = MAX_CANVAS_DIM / scrollW;
    const scaleForHeight = MAX_CANVAS_DIM / scrollH;
    const scaleCandidate = Math.min(1, scaleForWidth, scaleForHeight);

    // Recomendación: si scaleCandidate < 1, informamos en consola.
    if (scaleCandidate < 1) console.warn('Contenido muy alto/ancho, escalando canvas por factor', scaleCandidate);

    const canvas = await html2canvas(element, {
      scale: scaleCandidate,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    console.log('Canvas generado:', canvas.width, canvas.height, ' (scale:', scaleCandidate, ')');

    const imgData = canvas.toDataURL('image/jpeg', 0.9); // mayor calidad
    const { jsPDF } = window.jspdf;

    // Generar un PDF de una sola página con el tamaño exacto del canvas.
    // Así el PDF contendrá todo el canvas en una sola hoja (sin escalar a A4).
    const pdf = new jsPDF({
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

    // Usamos el valor del input id_diseno como nombre de archivo
    const idDisenoInput = document.getElementById('id_diseno');
    let fileName = idDisenoInput?.value.trim();
    if (!fileName) fileName = 'formulario'; // valor por defecto si está vacío

    pdf.save(`${fileName}.pdf`);
    console.log('PDF generado correctamente con nombre:', fileName);

  } catch (err) {
    console.error('Error al generar el PDF:', err);
    alert('Ocurrió un error al generar el PDF. Revisa la consola.');
  } finally {
    // Restaurar textareas: eliminar clones y volver a mostrar los originales
    textareaReplacements.forEach(r => {
      if (r.clone && r.clone.parentNode) r.clone.parentNode.removeChild(r.clone);
      r.textarea.style.display = r.originalDisplay;
    });

    // Restaurar estilos del contenedor y del documento
    element.style.height = originalElementStyles.height;
    element.style.maxHeight = originalElementStyles.maxHeight;
    element.style.overflow = originalElementStyles.overflow;
    element.style.width = originalElementStyles.width;
    docEl.style.overflow = originalDocOverflow;
    bodyEl.style.overflow = originalBodyOverflow;

    if (generateButton) {
      generateButton.style.visibility = 'visible'; // restaurar visibilidad del botón
    }
  }
}
