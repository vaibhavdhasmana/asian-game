// import { createContext, useContext, useEffect, useMemo, useState } from "react";

// const AuthCtx = createContext(null);
// const LS_USER = "app_user";
// const LS_TOKEN = "app_token";

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [token, setToken] = useState(null);

//   useEffect(() => {
//     try {
//       const u = localStorage.getItem(LS_USER);
//       const t = localStorage.getItem(LS_TOKEN);
//       if (u) setUser(JSON.parse(u));
//       if (t) setToken(t);
//     } catch {}
//   }, []);

//   const login = (userObj, tokenStr) => {
//     setUser(userObj);
//     setToken(tokenStr || null);
//     localStorage.setItem(LS_USER, JSON.stringify(userObj));
//     if (tokenStr) localStorage.setItem(LS_TOKEN, tokenStr);
//   };

//   const logout = () => {
//     setUser(null);
//     setToken(null);
//     localStorage.removeItem(LS_USER);
//     localStorage.removeItem(LS_TOKEN);
//   };

//   const value = useMemo(
//     () => ({ user, token, login, logout, isAuthed: !!user }),
//     [user, token]
//   );

//   return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
// }
// export const useAuth = () => useContext(AuthCtx);
import { createContext, useContext, useMemo, useState } from "react";
const AuthCtx = createContext(null);
const LS_USER = "ap_user";
export function AuthProvider({ children }) {
  // Initialize from localStorage synchronously to avoid redirect flicker on refresh
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem(LS_USER);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const login = (userObj) => {
    setUser(userObj);
    localStorage.setItem(LS_USER, JSON.stringify(userObj));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_USER);
  };

  const value = useMemo(
    () => ({ user, login, logout, isAuthed: !!user }),
    [user]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
