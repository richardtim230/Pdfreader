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
  const toggleMenu = document.getElementById("toggleMenu");
  const menu = document.getElementById("menu");

  // Initialize uploads and reading positions from localStorage
  const uploads = JSON.parse(localStorage.getItem("uploads")) || [];
  const readingPositions = JSON.parse(localStorage.getItem("readingPositions")) || {};

  /**
   * Updates the Recent Uploads Section
   */
  function updateRecentUploads() {
    recentUploadsList.innerHTML = ""; // Clear previous entries

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

    // Shorten long file names
    const shortName = upload.name.length > 20 ? `${upload.name.substring(0, 17)}...` : upload.name;

    const span = document.createElement("span");
    span.textContent = shortName;
    span.title = upload.name; // Show full name on hover
    span.addEventListener("click", () => loadUpload(upload));
    li.appendChild(span);

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
  fileInput.addEventListener("change", (event) => {
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

      saveUpload(file.name, fileType, fileContent);
      loadUpload({ name: file.name, type: fileType, content: fileContent });
    };

    reader.readAsDataURL(file); // Convert file to Base64
  });

  /**
   * Saves an uploaded file to localStorage
   */
  function saveUpload(name, type, content) {
    const encodedName = encodeURIComponent(name); // Handle spaces and special characters
    const index = uploads.findIndex((upload) => upload.name === encodedName);
    if (index !== -1) {
      uploads.splice(index, 1); // Remove duplicate
    }

    uploads.push({ name: encodedName, type, content });
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
      delete readingPositions[name]; // Remove associated reading position
      localStorage.setItem("uploads", JSON.stringify(uploads));
      localStorage.setItem("readingPositions", JSON.stringify(readingPositions));

      updateRecentUploads();
      updateHistory();
    }
  }

  /**
   * Loads an uploaded file into the viewer and restores the reading position
   */
  function loadUpload(upload) {
    viewer.innerHTML = ""; // Clear previous content
    fullscreenViewer.classList.add("visible"); // Open the viewer

    const readingPosition = readingPositions[upload.name] || 0;

    if (upload.type === "pdf") {
      renderPDF(upload.content, readingPosition);
    } else if (upload.type === "pptx") {
      renderPPT(upload.content, readingPosition);
    } else if (upload.type === "docx") {
      renderDOCX(upload.content, readingPosition);
    }
  }

  /**
   * Saves the current reading position
   */
  function saveReadingPosition(name, position) {
    readingPositions[name] = position;
    localStorage.setItem("readingPositions", JSON.stringify(readingPositions));
  }

  /**
   * Renders a PDF file in the viewer
   */
  async function renderPDF(content, startPage = 0) {
    try {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.js";

      const pdf = await pdfjsLib.getDocument(content).promise;

      for (let i = startPage + 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        viewer.appendChild(canvas);

        // Save reading position when scrolling
        canvas.addEventListener("click", () => saveReadingPosition(upload.name, i));
      }
    } catch (error) {
      console.error("Error rendering PDF:", error);
      viewer.innerHTML = "<p>Failed to load PDF file.</p>";
    }
  }

  /**
   * Renders a PPTX file in the viewer
   */
  async function renderPPT(content, startSlide = 0) {
    try {
      const arrayBuffer = await (await fetch(content)).arrayBuffer();
      const pptxLib = await import("https://unpkg.com/pptxgenjs@3.6.0/dist/pptxgen.min.js");
      const presentation = await pptxLib.PptxGenJS.load(arrayBuffer);

      presentation.slides.slice(startSlide).forEach((slide, index) => {
        const slideElement = document.createElement("div");
        slideElement.innerText = `Slide ${startSlide + index + 1}: ${slide.title || "Untitled"}`;
        slideElement.className = "slide-preview";
        viewer.appendChild(slideElement);

        slideElement.addEventListener("click", () => saveReadingPosition(upload.name, startSlide + index));
      });
    } catch (error) {
      console.error("Error rendering PPTX:", error);
      viewer.innerHTML = "<p>Failed to load PPTX file.</p>";
    }
  }

  /**
   * Renders a DOCX file in the viewer
   */
  async function renderDOCX(content, startOffset = 0) {
    try {
      const arrayBuffer = await (await fetch(content)).arrayBuffer();
      const mammoth = window.mammoth;

      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContainer = document.createElement("div");
      textContainer.className = "docx-text";
      textContainer.innerHTML = result.value.replace(/\n/g, "<br>"); // Preserve line breaks

      textContainer.scrollTop = startOffset; // Restore scroll position
      viewer.appendChild(textContainer);

      textContainer.addEventListener("scroll", () => saveReadingPosition(upload.name, textContainer.scrollTop));
    } catch (error) {
      console.error("Error rendering DOCX:", error);
      viewer.innerHTML = "<p>Failed to load DOCX file.</p>";
    }
  }

  /**
   * Toggle Hamburger Menu
   */
  toggleMenu.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  /**
   * Closes the fullscreen viewer
   */
  closeViewer.addEventListener("click", () => {
    fullscreenViewer.classList.remove("visible");
    viewer.innerHTML = ""; // Clear viewer content
  });

  /**
   * Clear all history
   */
  clearHistory.addEventListener("click", () => {
    localStorage.removeItem("uploads");
    localStorage.removeItem("readingPositions");
    uploads.length = 0;
    updateRecentUploads();
    updateHistory();
  });

  // Initialize the app
  updateRecentUploads();
  updateHistory();
});
