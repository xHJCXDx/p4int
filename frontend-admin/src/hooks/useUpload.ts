import { useMutation } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '../api/axios';

interface UploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

const uploadImagen = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<UploadResponse>>('/uploads/imagen', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.secure_url;
};

export const useUploadImagen = () => {
  return useMutation({
    mutationFn: uploadImagen,
  });
};
