/**
 * Atlassian Document Format (ADF) to plain text converter
 * Jira stores descriptions as structured JSON (ADF), this converts it to readable text
 */

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  attrs?: any;
}

/**
 * Converts ADF JSON to plain text
 * @param adfString - ADF JSON string or plain text
 * @returns Plain text representation
 */
export function parseADFToText(adfString: string | null | undefined): string {
  if (!adfString) return "";
  
  // If it's already plain text (not JSON), return as-is
  if (!adfString.trim().startsWith("{")) {
    return adfString;
  }
  
  try {
    const adf: ADFNode = JSON.parse(adfString);
    return extractTextFromNode(adf);
  } catch (e) {
    // If parsing fails, return the original string
    return adfString;
  }
}

function extractTextFromNode(node: ADFNode): string {
  if (!node) return "";
  
  // If node has text directly, return it
  if (node.text) {
    return node.text;
  }
  
  // If node has content, recursively extract text
  if (node.content && Array.isArray(node.content)) {
    const texts = node.content.map(child => extractTextFromNode(child));
    
    // Add spacing based on node type
    switch (node.type) {
      case "paragraph":
        return texts.join("") + "\n";
      case "heading":
        return texts.join("") + "\n\n";
      case "bulletList":
      case "orderedList":
        return texts.join("");
      case "listItem":
        return "• " + texts.join("").trim() + "\n";
      case "codeBlock":
        return texts.join("") + "\n";
      case "blockquote":
        return "> " + texts.join("") + "\n";
      case "hardBreak":
        return "\n";
      default:
        return texts.join("");
    }
  }
  
  return "";
}
