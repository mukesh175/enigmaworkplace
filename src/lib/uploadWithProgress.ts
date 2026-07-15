export type UploadResult = { url: string; name: string; size: number; mimeType: string | null };

export function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed — unexpected response."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));

    const formData = new FormData();
    formData.set("file", file);
    xhr.send(formData);
  });
}
