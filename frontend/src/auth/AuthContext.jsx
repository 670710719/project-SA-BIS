// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = async (username, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }), // เปลี่ยนจาก email เป็น username
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, login }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);