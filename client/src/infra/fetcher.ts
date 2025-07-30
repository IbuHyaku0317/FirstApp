import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_REST_HOST,
});

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);
