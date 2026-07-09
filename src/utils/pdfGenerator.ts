import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../supabaseClient";

/**
 * Generates a high-quality PDF from a DOM element and uploads it to Supabase Storage.
 * Path convention: cv-pdfs/{user_id}/{reference}.pdf
 * 
 * @param elementId The ID of the HTML container to render
 * @param userId The ID of the authenticated user
 * @param reference The unique reference for the CV (e.g. CV-2026-0001)
 * @returns The public URL of the uploaded PDF
 */
export async function generateAndUploadPDF(
  elementId: string,
  userId: string,
  reference: string
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Élément visuel introuvable pour la génération du PDF.");
  }

  // Use a temporary canvas to generate high-resolution image representation
  const canvas = await html2canvas(element, {
    scale: 2, // Scale up for crisp vector rendering of text
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  
  // Create jsPDF in portrait A4 size (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 0;

  // Page 1
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Add pages if the canvas is longer than A4 page height
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  const pdfBlob = pdf.output("blob");

  if (!supabase) {
    throw new Error("Le client Supabase n'est pas initialisé.");
  }

  const filePath = `${userId}/${reference}.pdf`;

  // Upload the compiled PDF file with upsert enabled to allow updates
  const { error: uploadError } = await supabase.storage
    .from("cv-pdfs")
    .upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      cacheControl: "60",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Échec de l'enregistrement du PDF dans Supabase : ${uploadError.message}`);
  }

  // Get the public access URL
  const { data: publicUrlData } = supabase.storage
    .from("cv-pdfs")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
