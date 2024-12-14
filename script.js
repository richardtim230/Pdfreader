document.addEventListener("DOMContentLoaded", () => {
  const startApp = document.getElementById("startApp");
  const uploadSection = document.querySelector(".upload-section");
  const fileInput = document.getElementById("fileInput");
  const viewer = document.getElementById("viewer");

  // Toolbar for exporting files
  const exportButton = document.createElement("button");
  exportButton.innerText = "Export File";
  exportButton.className = "toolbar-button hidden";
  document.body.appendChild(exportButton);

  // Variables for file and edits
  let currentFile = null;
  let currentFileType = null;
  let edits = {}; // Store annotations and comments for offline use

  // Show upload section on "Get Started"
  startApp.addEventListener("click", () => {
    uploadSection.classList.remove("hidden");
    window.scrollTo({ top: uploadSection.offsetTop, behavior: "smooth" });
  });

  // Handle file upload
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      currentFile = file;
      currentFileType = file.name.split(".").pop().toLowerCase();
      viewer.innerHTML = ""; // Clear previous content

      switch (currentFileType) {
        case "pdf":
          renderPDF(file);
          break;
        case "pptx":
          renderPPT(file);
          break;
        case "docx":
          renderWord(file);
          break;
        default:
          viewer.innerHTML = "<p>Unsupported file format! Please upload PDF, PPTX, or DOCX files.</p>";
      }
      exportButton.classList.remove("hidden");
    }
  });

  // PDF Rendering with Annotations
  async function renderPDF(file) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.js";

    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    viewer.innerHTML = `<p>Loaded PDF with ${pdf.numPages} pages:</p>`;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const viewport = page.getViewport({ scale: 1.5 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      viewer.appendChild(canvas);

      // Add Annotation Button
      const annotationButton = document.createElement("button");
      annotationButton.innerText = `Annotate Page ${i}`;
      annotationButton.onclick = () => addAnnotation(canvas, i);
      viewer.appendChild(annotationButton);
    }
  }

  // PPTX Rendering with Comments
  async function renderPPT(file) {
    const pptx = await file.arrayBuffer();
    const pptxLib = await import('https://unpkg.com/pptxgenjs@3.6.0/dist/pptxgen.min.js');
    const presentation = await pptxLib.PptxGenJS.load(pptx);

    viewer.innerHTML = `<p>Loaded PPTX with ${presentation.slides.length} slides:</p>`;
    presentation.slides.forEach((slide, index) => {
      const slideElement = document.createElement("div");
      slideElement.innerText = `Slide ${index + 1}: ${slide.title || "Untitled"}`;
      slideElement.className = "slide-preview";
      viewer.appendChild(slideElement);

      // Add Comment Button
      const commentButton = document.createElement("button");
      commentButton.innerText = `Comment on Slide ${index + 1}`;
      commentButton.onclick = () => addComment(slideElement, index + 1);
      viewer.appendChild(commentButton);
    });
  }

  // DOCX Rendering with Editable Text
  async function renderWord(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const docx = event.target.result;
      const mammoth = window.mammoth;

      mammoth
        .extractRawText({ arrayBuffer: docx })
        .then((result) => {
          viewer.innerHTML = `<p>Extracted Word Document Content:</p><div contenteditable="true">${result.value}</div>`;
          edits.text = result.value; // Save text for export
        })
        .catch((err) => {
          console.error(err);
          viewer.innerHTML = "<p>Failed to load DOCX file.</p>";
        });
    };
    reader.readAsArrayBuffer(file);
  }

  // Export File
  exportButton.addEventListener("click", () => {
    if (!currentFile || !currentFileType) return;

    const link = document.createElement("a");
    link.download = `Edited_${currentFile.name}`;

    if (currentFileType === "pdf") {
      alert("Export for PDF is under development.");
    } else if (currentFileType === "pptx") {
      alert("Export for PPTX is under development.");
    } else if (currentFileType === "docx") {
      const blob = new Blob([edits.text || ""], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      link.href = URL.createObjectURL(blob);
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Add Annotation to PDF
  function addAnnotation(canvas, pageNum) {
    const note = prompt(`Add a note to Page ${pageNum}:`);
    if (note) {
      const context = canvas.getContext("2d");
      context.fillStyle = "yellow";
      context.font = "16px Arial";
      context.fillText(note, 10, canvas.height - 20); // Add note to canvas
      edits[`page${pageNum}`] = note; // Save annotations
    }
  }

  // Add Comment to PPT
  function addComment(element, slideNum) {
    const comment = prompt(`Add a comment to Slide ${slideNum}:`);
    if (comment) {
      const commentDiv = document.createElement("div");
      commentDiv.className = "comment";
      commentDiv.innerText = `Comment: ${comment}`;
      element.appendChild(commentDiv);
      edits[`slide${slideNum}`] = comment; // Save comments
    }
  }
});

// Register the Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
}
