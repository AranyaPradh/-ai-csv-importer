const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const uploadCsv = async (endpoint, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
};

export const previewImport = (file) => uploadCsv("/imports/preview", file);

export const confirmImport = (file) => uploadCsv("/imports/confirm", file);
