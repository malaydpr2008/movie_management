export interface MediaAsset {
  id: string;
  file_url: string;
  file_type: string;
  object_id: string;
  uploaded_at: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}
