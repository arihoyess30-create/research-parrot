import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("rp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const api = {
  get:    (url, cfg)       => client.get(url, cfg).then(r => r.data),
  post:   (url, data, cfg) => client.post(url, data, cfg).then(r => r.data),
  put:    (url, data, cfg) => client.put(url, data, cfg).then(r => r.data),
  delete: (url, cfg)       => client.delete(url, cfg).then(r => r.data),
  raw: client,
};

export default api;
