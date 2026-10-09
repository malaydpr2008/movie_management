export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData));
      } else {
        const errorText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errorText.substring(0, 100)}...`);
      }
    }

    return res.json() as Promise<T>;
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch");
  }
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
