document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const recentUploadsSection = document.getElementById("recentUploads");
  const recentUploadsList = document.getElementById("recentUploadsList");
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");
  const clearHistory = document.getElementById("clearHistory");
  const fullscreenViewer = document.getElementById("fullscreenViewer");
  const viewer = document.getElementById("viewer");
  const closeViewer = document.getElementById("closeViewer");

  // Initialize uploads from localStorage
  const uploads = JSON.parse(localStorage.getItem("uploads")) || [];

  /**
   * Updates the Recent Uploads Section
   */
  function updateRecentUploads() {
    recentUploadsList.innerHTML = ""; // Clear previous entries

    // Show the last 3 uploads
    const recentFiles = uploads.slice(-3).reverse();
    recentFiles.forEach((upload) => {
      const li = createUploadListItem(upload);
      recentUploadsList.appendChild(li);
    });

    recentUploadsSection.classList.toggle("hidden", uploads.length === 0);
  }

  /**
   * Updates the History Section
   */
  function updateHistory() {
    historyList.innerHTML = ""; // Clear previous entries

    uploads.forEach((upload) => {
      const li = createUploadListItem(upload);
      historyList.appendChild(li);
    });

    historySection.classList.toggle("hidden", uploads.length === 0);
  }

  /**
   * Creates an upload list item with delete functionality
   */
  function createUploadListItem(upload) {
    const li = document.createElement("li");
    li.className = "upload-item";

    // File Name
    const span = document.createElement("span");
    span.textContent = upload.name;
    span.addEventListener("click", () => loadUpload(upload));
    li.appendChild(span);

    // Delete Button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-button";
    deleteButton.addEventListener("click", () => deleteUpload(upload.name));
    li.appendChild(deleteButton);

    return li;
  }

  /**
   * Handles file input and saves the upload
   */
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileType = file.name.split(".").pop().toLowerCase();

    if (!["pdf", "pptx", "docx"].includes(fileType)) {
      alert("Unsupported file type. Please upload a PDF, PPTX, or DOCX file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;

      // Save to uploads and reload the viewer
      saveUpload(file.name, fileType, fileContent);
      loadUpload({ name: file.name, type: fileType, content: fileContent });
    };

    reader.readAsDataURL(file); // Convert file to Base64
  });

  /**
   * Saves an uploaded file to localStorage
   */
  function saveUpload(name, type, content) {
    // Remove duplicates by file name
    const index = uploads.findIndex((upload) => upload.name === name);
    if (index !== -1) {
      uploads.splice(index, 1); // Remove the old entry
    }

    // Add the new or updated entry
    uploads.push({ name, type, content });
    localStorage.setItem("uploads", JSON.stringify(uploads));

    updateRecentUploads();
    updateHistory();
  }

  /**
   * Deletes an uploaded file from localStorage
   */
  function deleteUpload(name) {
    const index = uploads.findIndex((upload) => upload.name === name);
    if (index !== -1) {
      uploads.splice(index, 1); // Remove the entry
      localStorage.setItem("uploads", JSON.stringify(uploads));

      updateRecentUploads();
      updateHistory();
    }
  }

  /**
   * Loads an uploaded file into the viewer
   */
  function loadUpload(upload) {
    viewer.innerHTML = ""; // Clear previous content
    fullscreenViewer.classList.add("visible"); // Open the viewer

    if (upload.type === "pdf") {
      renderPDF(upload.content);
    } else if (upload.type === "pptx") {
      renderPPT(upload.content);
    } else if (upload.type === "docx") {
      renderDOCX(upload.content);
    }
  }

  /**
   * Renders a PDF file in the viewer
   */
  async function renderPDF(content) {
    try {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.js";

      const pdf = await pdfjsLib.getDocument(content).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        viewer.appendChild(canvas);
      }
    } catch (error) {
      console.error("Error rendering PDF:", error);
      viewer.innerHTML = "<p>Failed to load PDF file.</p>";
    }
  }

  /**
   * Renders a PPTX file in the viewer
   */
  async function renderPPT(content) {
    try {
      const arrayBuffer = await (await fetch(content)).arrayBuffer();
      const pptxLib = await import("https://unpkg.com/pptxgenjs@3.6.0/dist/pptxgen.min.js");
      const presentation = await pptxLib.PptxGenJS.load(arrayBuffer);

      viewer.innerHTML = `<p>Loaded PPTX with ${presentation.slides.length} slides:</p>`;
      presentation.slides.forEach((slide, index) => {
        const slideElement = document.createElement("div");
        slideElement.innerText = `Slide ${index + 1}: ${slide.title || "Untitled"}`;
        slideElement.className = "slide-preview";
        viewer.appendChild(slideElement);
      });
    } catch (error) {
      console.error("Error rendering PPTX:", error);
      viewer.innerHTML = "<p>Failed to load PPTX file.</p>";
    }
  }

  /**
   * Renders a DOCX file in the viewer
   */
  async function renderDOCX(content) {
    try {
      const arrayBuffer = await (await fetch(content)).arrayBuffer();
      const mammoth = window.mammoth;

      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContainer = document.createElement("div");
      textContainer.className = "docx-text";
      textContainer.innerHTML = result.value.replace(/\n/g, "<br>"); // Preserve line breaks
      viewer.appendChild(textContainer);
    } catch (error) {
      console.error("Error rendering DOCX:", error);
      viewer.innerHTML = "<p>Failed to load DOCX file.</p>";
    }
  }

  /**
   * Clears the history from localStorage and UI
   */
  clearHistory.addEventListener("click", () => {
    localStorage.removeItem("uploads");
    uploads.length = 0; // Clear the in-memory uploads array
    updateRecentUploads();
    updateHistory();
  });

  /**
   * Closes the fullscreen viewer
   */
  closeViewer.addEventListener("click", () => {
    fullscreenViewer.classList.remove("visible");
    viewer.innerHTML = ""; // Clear viewer content
  });

  // Initialize the app
  updateRecentUploads();
  updateHistory();
});
