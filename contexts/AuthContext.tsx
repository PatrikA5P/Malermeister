
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../officeTypes';
import { cryptoService } from '../services/cryptoService';

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    loginWithProvider: (provider: 'google' | 'apple') => Promise<boolean>;
    logout: () => void;
    isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
    login: async () => false,
    loginWithProvider: async () => false,
    logout: () => {},
    isDevMode: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- DEV CONFIG ---
    const IS_DEV_MODE = true; 

    useEffect(() => {
        const init = async () => {
            const stored = localStorage.getItem('borer_session');
            if (stored) {
                const parsedUser = JSON.parse(stored);
                setUser(parsedUser);
                if (IS_DEV_MODE) await cryptoService.loadDevKey();
            }
            setIsLoading(false);
        };
        init();
    }, []);

    const setupSession = async (mockUser: AuthUser) => {
        if (IS_DEV_MODE) {
            await cryptoService.loadDevKey();
        } else {
            await cryptoService.generateMasterKey(); 
        }
        setUser(mockUser);
        localStorage.setItem('borer_session', JSON.stringify(mockUser));
        return true;
    };

    const login = async (email: string, pass: string): Promise<boolean> => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (email.includes('@') && pass.length > 0) {
            const mockUser: AuthUser = {
                id: 'u-dev-123',
                email: email,
                name: email.split('@')[0], 
                companyId: 'tenant-dev',
                role: 'owner'
            };
            const result = await setupSession(mockUser);
            setIsLoading(false);
            return result;
        }
        
        setIsLoading(false);
        return false;
    };

    const loginWithProvider = async (provider: 'google' | 'apple'): Promise<boolean> => {
        setIsLoading(true);
        // Simulation OAuth Redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser: AuthUser = {
            id: `u-${provider}-123`,
            email: `toni.borer@${provider}.com`,
            name: 'Toni Borer',
            companyId: 'tenant-dev',
            role: 'owner'
        };
        
        const result = await setupSession(mockUser);
        setIsLoading(false);
        return result;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('borer_session');
        window.location.reload(); 
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, loginWithProvider, logout, isDevMode: IS_DEV_MODE }}>
            {children}
        </AuthContext.Provider>
    );
};
