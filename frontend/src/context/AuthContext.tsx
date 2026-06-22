/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, getApiErrorMessage } from "../api/http";
import type { AuthUser, TokenResponse } from "../models/Auth";

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isSessionLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ME_QUERY_KEY = ["auth", "me"] as const;

function setApiBearerToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem("auth_user");
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser) as AuthUser;
    } catch {
      return null;
    }
  });

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<AuthUser>("/auth/me");
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(null);
    setUser(meQuery.data);
    localStorage.setItem("auth_user", JSON.stringify(meQuery.data));
  }, [meQuery.data]);

  useEffect(() => {
    if (!meQuery.error) return;

    if (axios.isAxiosError(meQuery.error) && meQuery.error.response?.status === 401) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(null);
      setUser(null);
      localStorage.removeItem("auth_user");
    }
  }, [meQuery.error]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
      setApiBearerToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Email o contrasena invalidos"), { cause: err });
    }
  }, [queryClient]);

  const logout = useCallback(() => {
    void api.post("/auth/logout").catch(() => undefined);
    setApiBearerToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_user");
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      token,
      user,
      isSessionLoading: meQuery.isLoading || meQuery.isFetching,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [token, user, meQuery.isLoading, meQuery.isFetching, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
