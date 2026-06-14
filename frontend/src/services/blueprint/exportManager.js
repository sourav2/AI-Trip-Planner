/**
 * Export Manager Service
 * Coordinates rendering checks and final formatting triggers for downloadable formats.
 */
import html2canvas from 'html2canvas';

export const exportManager = {
  /**
   * Triggers PNG render export of the given element
   */
  async generatePNG(elementId, fileName = 'trip-blueprint.png') {
    console.log(`[exportManager] Triggering generatePNG for element: #${elementId} -> saving to: ${fileName}`);
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    const originalStyle = element.getAttribute('style') || '';
    
    // Temporarily remove max-height, content-visibility, and overflow restrictions to ensure nothing is cropped
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.height = 'auto';
    element.style.contentVisibility = 'visible';

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // High resolution scale
        backgroundColor: '#FFFFFF',
        logging: false
      });

      // Restore original style
      element.setAttribute('style', originalStyle);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      return {
        success: true,
        format: "PNG",
        fileName,
        message: "PNG exported successfully."
      };
    } catch (err) {
      element.setAttribute('style', originalStyle);
      console.error('Error generating PNG:', err);
      throw err;
    }
  },

  /**
   * Triggers JPG render export of the given element
   */
  async generateJPG(elementId, fileName = 'trip-blueprint.jpg') {
    console.log(`[exportManager] Triggering generateJPG for element: #${elementId} -> saving to: ${fileName}`);
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    const originalStyle = element.getAttribute('style') || '';
    
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.height = 'auto';
    element.style.contentVisibility = 'visible';

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false
      });

      element.setAttribute('style', originalStyle);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      return {
        success: true,
        format: "JPG",
        fileName,
        message: "JPG exported successfully."
      };
    } catch (err) {
      element.setAttribute('style', originalStyle);
      console.error('Error generating JPG:', err);
      throw err;
    }
  },

  /**
   * Triggers PDF render export via window print formatting
   */
  async generatePDF(elementId, fileName = 'trip-blueprint.pdf') {
    console.log(`[exportManager] Triggering generatePDF for element: #${elementId} -> saving to: ${fileName}`);
    const printContent = document.getElementById(elementId);
    if (!printContent) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    const printWindow = window.open('about:blank', 'PrintWindow', 'left=50000,top=50000,width=900,height=1000');
    printWindow.document.write(`
      <html>
        <head>
          <title>${fileName.replace('.pdf', '')}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { 
              font-family: sans-serif; 
              padding: 40px; 
              background: white; 
              color: black; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            th, td { 
              border-bottom: 1px solid #E2E8F0; 
            }
            img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
            }
            svg {
              max-width: 100%;
              page-break-inside: avoid;
            }
            @media print {
              body { 
                padding: 20px; 
              }
              /* Prevent clipping on elements */
              .page-break-avoid { 
                page-break-inside: avoid; 
              }
            }
          </style>
        </head>
        <body>
          <div class="max-w-4xl mx-auto">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    return {
      success: true,
      format: "PDF",
      fileName,
      message: "PDF print window triggered successfully."
    };
  }
};
