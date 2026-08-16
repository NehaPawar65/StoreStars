import axios from "axios";
import { getToken } from "./auth.jsx";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

// Attaches the JWT to every request, so no component writes an auth header.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(err) {
  return err.response?.data?.message || "Something went wrong, please try again";
}

export default api;
