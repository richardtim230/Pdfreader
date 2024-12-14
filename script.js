document.addEventListener("DOMContentLoaded", () => {
  const startApp = document.getElementById("startApp");
  const uploadSection = document.querySelector(".upload-section");
  const fileInput = document.getElementById("fileInput");
  const viewer = document.getElementById("viewer");
  const fullscreenViewer = document.getElementById("fullscreenViewer");
  const closeViewer = document.getElementById("closeViewer");
  const toggleMenu = document.getElementById("toggleMenu");
  const menu = document.getElementById("menu");
  const viewHistory = document.getElementById("viewHistory");
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");
  const clearHistory = document.getElementById("clearHistory");

  // Initialize history from localStorage
  const history = JSON.parse(localStorage.getItem("documentHistory")) || [];

  // Toggle Hamburger Menu
  toggleMenu.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  // Show Upload Section
  startApp.addEventListener("click", () => {
    uploadSection.classList.remove("hidden");
  });

  // Handle File Upload
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.name.split(".").pop().toLowerCase();
      viewer.innerHTML = ""; // Clear previous content

      // Open Fullscreen Viewer
      fullscreenViewer.classList.add("visible");

      // Render file based on type
      switch (fileType) {
        case "pdf":
          await renderPDF(file);
          break;
        case "pptx":
          await renderPPT(file);
          break;
        case "docx":
          await renderWord(file);
          break;
        default:
          viewer.innerHTML = "<p>Unsupported file format!</p>";
          fullscreenViewer.classList.remove("visible");
      }

      // Save file to history
      addToHistory(file.name);
    }
  });

  // Close Fullscreen Viewer
  closeViewer.addEventListener("click", () => {
    fullscreenViewer.classList.remove("visible");
    viewer.innerHTML = ""; // Clear viewer content
  });

  // Render PDF
  async function renderPDF(file) {
    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.js";

      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
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

  // Render PPTX
  async function renderPPT(file) {
    try {
      const pptx = await file.arrayBuffer();
      const pptxLib = await import('https://unpkg.com/pptxgenjs@3.6.0/dist/pptxgen.min.js');
      const presentation = await pptxLib.PptxGenJS.load(pptx);

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

  // Render DOCX
  async function renderWord(file) {
    try {
      const reader = new FileReader();
      reader.onload = function (event) {
        const docx = event.target.result;
        const mammoth = window.mammoth;

        mammoth
          .extractRawText({ arrayBuffer: docx })
          .then((result) => {
            viewer.innerHTML = `<p>Extracted Word Document Content:</p><div>${result.value}</div>`;
          })
          .catch((err) => {
            console.error("Error rendering DOCX:", err);
            viewer.innerHTML = "<p>Failed to load DOCX file.</p>";
          });
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error reading DOCX file:", error);
    }
  }

  // Add File to History
  function addToHistory(fileName) {
    if (!history.includes(fileName)) {
      history.push(fileName);
      localStorage.setItem("documentHistory", JSON.stringify(history));
    }
  }

  // Display History
  viewHistory.addEventListener("click", () => {
    historySection.classList.add("visible");
    historyList.innerHTML = "";

    history.forEach((fileName) => {
      const li = document.createElement("li");
      li.textContent = fileName;
      historyList.appendChild(li);
    });
  });

  // Clear History
  clearHistory.addEventListener("click", () => {
    localStorage.removeItem("documentHistory");
    history.length = 0;
    historyList.innerHTML = "<p>History cleared!</p>";
  });
});

// History click event
historyList.addEventListener("click", (event) => {
  const fileName = event.target.textContent;
  if (fileName) {
    const file = history.find((item) => item === fileName); // Simulating reloading
    if (file) {
      loadFromHistory(file); // Call appropriate rendering based on file type
    }
  }
});

// Load material from history
function loadFromHistory(fileName) {
  // Simulate re-rendering content from the file name in history
  // In production, you would reload the corresponding data from storage
  const fileExtension = fileName.split('.').pop().toLowerCase();

  switch (fileExtension) {
    case "pdf":
      renderPDFFromHistory();
      break;
    case ".ppt":
