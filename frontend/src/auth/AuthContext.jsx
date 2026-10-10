// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = async (username, password) => {
        let response;

        try {
            response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
        } catch {
            throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาเปิด backend ที่พอร์ต 8080');
        }

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error('เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง กรุณาตรวจสอบว่า backend ทำงานอยู่');
            }
        }

        if (!response.ok) {
            const error = new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
            error.field = data.field;
            throw error;
        }

        if (!data.token || !data.user) {
            throw new Error('ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ครบถ้วน');
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const register = async (username, password, confirmPassword) => {
        let response;

        try {
            response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, confirmPassword }),
            });
        } catch {
            throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาเปิด backend ที่พอร์ต 8080');
        }

        const responseText = await response.text();
        let data = {};
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error('เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง');
            }
        }

        if (!response.ok) {
            const error = new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
            error.field = data.field;
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);