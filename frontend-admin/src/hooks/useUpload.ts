import { useMutation } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '../api/axios';

interface UploadResponse {
  url: string;
}

const uploadImagen = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<UploadResponse>>('/uploads/imagen', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
};

export const useUploadImagen = () => {
  return useMutation({
    mutationFn: uploadImagen,
  });
};
