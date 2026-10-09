export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string | null;
}

export interface PendingBreakdown {
  scenes: {
    heading: string;
    synopsis: string;
    characters: string[];
  }[];
}

export interface AssetFile {
  key: string;
  size: number;
  last_modified: string;
  url: string;
}
