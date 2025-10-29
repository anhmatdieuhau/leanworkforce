import { readFileSync } from "fs";
import mammoth from "mammoth";

// @ts-ignore - pdf-parse doesn't have proper TypeScript types
const pdfParse = require("pdf-parse");

export interface ParseResult {
  text: string;
  error?: string;
}

/**
 * Extract text from PDF file with retry logic
 */
async function extractPDFText(filePath: string, retries = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dataBuffer = readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("PDF parsing resulted in empty text");
      }
      
      return data.text;
    } catch (error: any) {
      lastError = error;
      console.error(`PDF extraction attempt ${attempt}/${retries} failed:`, error.message);
      
      // Exponential backoff: wait 2^attempt seconds
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying PDF extraction in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`PDF extraction failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Extract text from DOC/DOCX file with retry logic
 */
async function extractDocxText(filePath: string, retries = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error("DOCX parsing resulted in empty text");
      }
      
      return result.value;
    } catch (error: any) {
      lastError = error;
      console.error(`DOCX extraction attempt ${attempt}/${retries} failed:`, error.message);
      
      // Exponential backoff
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying DOCX extraction in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`DOCX extraction failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Parse document and extract text based on file type
 * Supports: PDF, DOC, DOCX, TXT
 */
export async function parseDocument(filePath: string, mimeType?: string): Promise<ParseResult> {
  try {
    // Determine file type from mimetype or file extension
    const fileExtension = filePath.toLowerCase().split('.').pop();
    
    let text: string;
    
    if (mimeType === 'application/pdf' || fileExtension === 'pdf') {
      console.log('Parsing PDF document...');
      text = await extractPDFText(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileExtension === 'docx' ||
      fileExtension === 'doc'
    ) {
      console.log('Parsing Word document...');
      text = await extractDocxText(filePath);
    } else if (mimeType?.startsWith('text/') || fileExtension === 'txt') {
      console.log('Reading plain text document...');
      text = readFileSync(filePath, 'utf-8');
    } else {
      return {
        text: '',
        error: `Unsupported file type: ${mimeType || fileExtension}. Please upload PDF, DOC, DOCX, or TXT files.`
      };
    }
    
    // Validate we got meaningful text
    if (!text || text.trim().length < 50) {
      return {
        text: text || '',
        error: 'Document appears to be empty or too short. Please ensure your CV contains readable text.'
      };
    }
    
    console.log(`Successfully extracted ${text.length} characters from document`);
    return { text };
    
  } catch (error: any) {
    console.error('Document parsing error:', error);
    return {
      text: '',
      error: `Failed to parse document: ${error.message}. Please try a different file or format.`
    };
  }
}

/**
 * Validate file type before processing
 */
export function validateFileType(filename: string, mimeType?: string): { valid: boolean; error?: string } {
  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  const fileExtension = filename.toLowerCase().split('.').pop();
  
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file. Received: .${fileExtension}`
    };
  }
  
  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    // Be lenient with mime type since some browsers send different values
    console.warn(`Unexpected MIME type: ${mimeType} for file ${filename}`);
  }
  
  return { valid: true };
}
