export interface ParsedItem {
    name: string;
    notes?: string;
  }
  
  export function parseRankingListInput(text: string): ParsedItem[] {
    if (!text.trim()) return [];
    
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return lines.map(line => parseLine(line));
  }
  
  function parseLine(line: string): ParsedItem {
    // Remove common prefixes (numbers, bullets, etc.)
    let cleaned = line
      .replace(/^\d+\.?\s*/, '')           // "1. Item" or "1 Item"
      .replace(/^[•\-\*]\s*/, '')         // "• Item" or "- Item" or "* Item"
      .trim();
    
    // Extract notes in parentheses
    const notesMatch = cleaned.match(/^(.+?)\s*\((.+?)\)$/);
    if (notesMatch) {
      return {
        name: notesMatch[1].trim(),
        notes: notesMatch[2].trim()
      };
    }
    
    return { name: cleaned };
  }