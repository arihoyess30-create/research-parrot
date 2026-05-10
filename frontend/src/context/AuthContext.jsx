import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("rp_token"));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("rp_user")); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const form = new URLSearchParams({ username: email, password });
    const data = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("rp_token", data.access_token);
    localStorage.setItem("rp_user",  JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (full_name, email, password) => {
    const data = await api.post("/auth/register", { full_name, email, password });
    localStorage.setItem("rp_token", data.access_token);
    localStorage.setItem("rp_user",  JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("rp_token");
    localStorage.removeItem("rp_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
